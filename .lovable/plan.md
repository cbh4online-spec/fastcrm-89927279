
# Behavioral Revenue Forecasting Module

## What This Builds

A revenue forecasting engine that replaces naive pipeline-stage probability with **behavioral probability** from `deal_scores`. Instead of "this deal is in Negotiation stage (80%)," it says "this deal scores 73 based on actual engagement, intent, trust, and recency — so it contributes €7,300 of a €10,000 opportunity."

The module has two layers:
1. A **server-side computation** edge function that aggregates all opportunities + deal scores and stores structured forecast totals in a new `revenue_forecasts` table.
2. A **"Revenue Intelligence" card** that can be embedded in the existing `StrategyPage` (which already has Deal Intelligence and Weekly Brief tabs) as a new tab, plus a standalone widget usable on the Dashboard.

---

## What Already Exists (No Duplication)

- `deal_scores` table — already created with `close_score`, `category`, `urgency` per opportunity
- `opportunities` table — has `value`, `expected_close_date`, `status`, `workspace_id`
- `compute-deal-score` edge function — already writes scores
- `StrategyPage` at `/dashboard/strategy` — already has tabbed layout, perfect place to add a "Revenue Forecast" tab
- `DashboardKPICards` and `RevenueWidget` — the new widget slots alongside these

---

## Architecture

```text
[compute-revenue-forecast edge function]
         │
         ├─ Query: opportunities WHERE status='open' + deal_scores JOIN
         ├─ Query: historical won opportunities (last 90 days)
         │
         ├─ For each opportunity:
         │    close_probability  = close_score / 100
         │    expected_revenue   = value * close_probability
         │    confidence_weight  = by category (hot→0.9, likely→0.7, uncertain→0.4, low→0.15)
         │    weighted_revenue   = expected_revenue * confidence_weight
         │
         ├─ Bucket by expected_close_date into 7d / 30d / 90d windows
         ├─ Compute best_case, expected_case, worst_case, risk_index
         │
         └─ UPSERT → revenue_forecasts table
         
[useRevenueForecast hook]
         │
         └─ Reads latest forecast from table
            + exposes generateForecast() mutation (calls edge fn on-demand)

[RevenueIntelligenceCard component]
         │
         ├─ Expected revenue + confidence ring
         ├─ 3 scenario bars (best / expected / worst)
         ├─ Risk index gauge
         ├─ Trend vs last snapshot
         └─ Per-horizon chips: 7d / 30d / 90d

[StrategyPage — new "Receita" tab]
         └─ Full RevenueIntelligenceCard + opportunity breakdown table
```

---

## Scope of Files

| Layer | File | Action |
|---|---|---|
| Database | migration | Create `revenue_forecasts` table + RLS |
| Edge Function | `supabase/functions/compute-revenue-forecast/index.ts` | New |
| Config | `supabase/config.toml` | Register function |
| Hook | `src/hooks/useRevenueForecast.ts` | New |
| Component | `src/components/revenue/RevenueIntelligenceCard.tsx` | New |
| Page | `src/pages/StrategyPage.tsx` | Add "Receita" tab |
| Dashboard | `src/components/dashboard/DashboardKPICards.tsx` | Add behavioral forecast value |

---

## 1. Database: `revenue_forecasts` Table

```sql
CREATE TABLE public.revenue_forecasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  generated_at    timestamptz NOT NULL DEFAULT now(),

  -- Horizon totals (weighted_revenue summed per window)
  forecast_7      numeric NOT NULL DEFAULT 0,
  forecast_30     numeric NOT NULL DEFAULT 0,
  forecast_90     numeric NOT NULL DEFAULT 0,

  -- Scenario totals
  best_case       numeric NOT NULL DEFAULT 0,   -- sum(value) WHERE category = 'hot'
  expected_case   numeric NOT NULL DEFAULT 0,   -- sum(value * close_probability)
  worst_case      numeric NOT NULL DEFAULT 0,   -- sum(weighted_revenue) (most conservative)

  -- Derived
  risk_index      numeric NOT NULL DEFAULT 0,   -- 1 - (worst_case / best_case), 0–1
  confidence_avg  numeric NOT NULL DEFAULT 0,   -- mean close_score across open opps

  -- Detail snapshot for trend comparison
  opportunity_count  integer NOT NULL DEFAULT 0,
  hot_count          integer NOT NULL DEFAULT 0,
  likely_count       integer NOT NULL DEFAULT 0,
  uncertain_count    integer NOT NULL DEFAULT 0,
  low_count          integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.revenue_forecasts(workspace_id, generated_at DESC);

ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read forecasts"
  ON public.revenue_forecasts FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "service role manages forecasts"
  ON public.revenue_forecasts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

Only two rows will typically exist per workspace (current + previous) — the hook always reads the latest. No data growth concern.

---

## 2. Edge Function: `compute-revenue-forecast`

**Input:** `{ workspace_id }` — on-demand from UI or cron.

### Data Queries (parallel)

```typescript
const [oppsResult, scoresResult, wonHistoryResult] = await Promise.all([
  // All open opportunities with value + expected_close_date
  supabase.from('opportunities')
    .select('id, value, expected_close_date, status')
    .eq('workspace_id', workspace_id)
    .eq('status', 'open'),

  // All deal_scores for workspace
  supabase.from('deal_scores')
    .select('opportunity_id, close_score, category')
    .eq('workspace_id', workspace_id),

  // Historical won deals (last 90 days) for avg close delay
  supabase.from('opportunities')
    .select('value, updated_at, expected_close_date')
    .eq('workspace_id', workspace_id)
    .eq('status', 'won')
    .gte('updated_at', ninetyDaysAgo),
]);
```

### Per-Opportunity Computation

```
confidence_weight = { hot: 0.9, likely: 0.7, uncertain: 0.4, low: 0.15 }

close_probability  = close_score / 100
expected_revenue   = value * close_probability
weighted_revenue   = expected_revenue * confidence_weight[category]
```

If an opportunity has **no deal score yet**, use the raw pipeline stage approach as fallback (value * 0.3) so it still contributes.

### Horizon Bucketing

An opportunity contributes to `forecast_7` / `forecast_30` / `forecast_90` based on its `expected_close_date`:
- ≤ 7 days from now → `forecast_7`
- ≤ 30 days → `forecast_30`
- ≤ 90 days → `forecast_90`

If `expected_close_date` is null, it contributes only to `forecast_90` (most conservative).

Each horizon sums `weighted_revenue` (not `expected_revenue`), making it the conservative realistic view.

### Scenario Totals (across all open opportunities regardless of horizon)

```
best_case     = SUM(value)   WHERE category = 'hot'
expected_case = SUM(value * close_probability)   [all opps]
worst_case    = SUM(weighted_revenue)            [all opps, most conservative]
risk_index    = best_case > 0 ? 1 - (worst_case / best_case) : 0
confidence_avg = MEAN(close_score) across all scored opps
```

### Historical Close Delay (informational only, stored in metadata)

Compute average days between `expected_close_date` and actual `updated_at` (for won deals) to show accuracy context in the UI tooltip: "On average, your deals close X days after their expected date."

### Storage

```typescript
await supabase.from('revenue_forecasts').insert({
  workspace_id,
  forecast_7, forecast_30, forecast_90,
  best_case, expected_case, worst_case,
  risk_index, confidence_avg,
  opportunity_count, hot_count, likely_count, uncertain_count, low_count,
  generated_at: new Date().toISOString(),
});
// Note: INSERT not UPSERT — we keep history for trend calculation
```

Returns the inserted row to the caller.

---

## 3. React Hook: `useRevenueForecast`

```typescript
// src/hooks/useRevenueForecast.ts

export interface RevenueForecast {
  id: string;
  workspace_id: string;
  generated_at: string;
  forecast_7: number;
  forecast_30: number;
  forecast_90: number;
  best_case: number;
  expected_case: number;
  worst_case: number;
  risk_index: number;
  confidence_avg: number;
  opportunity_count: number;
  hot_count: number;
  likely_count: number;
  uncertain_count: number;
  low_count: number;
}

export function useRevenueForecast() {
  // Fetches latest 2 forecasts (for trend comparison)
  // queryKey: ["revenue-forecast", currentWorkspace?.id]
  // Returns: latestForecast, previousForecast, trend (% change in expected_case)
}

export function useGenerateRevenueForecast() {
  // useMutation: calls compute-revenue-forecast edge function
  // invalidates ["revenue-forecast"] on success
}
```

**Trend calculation:**
```
trend = previousForecast
  ? pctChange(latest.expected_case, previous.expected_case)
  : null
```

---

## 4. Component: `RevenueIntelligenceCard`

**Location:** `src/components/revenue/RevenueIntelligenceCard.tsx`

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ 💡 Revenue Intelligence            [Atualizar] [Generated: ago]│
├──────────────────────────────────────────────────────────────── │
│  Horizons row (3 chips):                                        │
│  [7 dias: €8.2K] [30 dias: €24K] [90 dias: €61K]              │
├──────────────────────────────────────────────────────────────── │
│  Scenarios (3 cards):                                           │
│  ┌──────────────┐ ┌───────────────────┐ ┌────────────────┐    │
│  │ Melhor Caso  │ │  Caso Esperado ★  │ │  Pior Caso     │    │
│  │ €85K  (Hot)  │ │  €52K            │ │  €28K          │    │
│  └──────────────┘ └───────────────────┘ └────────────────┘    │
├──────────────────────────────────────────────────────────────── │
│  Risk Index:  ████████░░  78%  "Risco elevado — dispersão..."  │
│  Confiança:   ████░░░░░░  61 pts médios                        │
├──────────────────────────────────────────────────────────────── │
│  Distribuição: 🔴 3 Hot  🟢 5 Likely  🟡 8 Uncertain  ⚪ 4 Low│
└────────────────────────────────────────────────────────────────┘
```

- **Risk index** color: 0–40% → green, 41–70% → amber, 71–100% → red
- **Trend badge** next to "Caso Esperado": `+12.3% vs semana anterior`
- Loading skeleton matches the card layout
- Empty state: "Nenhuma oportunidade com score calculado" + "Gerar Previsão" CTA

---

## 5. Integration in `StrategyPage`

Add a third tab **"Receita"** (`💰 Receita`) to the existing `Tabs`:

```tsx
<TabsTrigger value="revenue">💰 Receita</TabsTrigger>
...
<TabsContent value="revenue">
  <RevenueIntelligenceCard />
  <OpportunityForecastTable />  {/* per-opportunity breakdown */}
</TabsContent>
```

The `OpportunityForecastTable` shows each open opportunity with:
- Title
- Value
- Deal Score badge (color-coded)
- Category
- Weighted Revenue contribution
- Expected close date

This gives the sales manager full transparency on what drives the forecast number.

---

## 6. Cron Schedule

Add a daily `pg_cron` job (via the insert tool, not migration) running at 07:00 UTC:

```sql
SELECT cron.schedule(
  'compute-revenue-forecast-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/compute-revenue-forecast',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb  -- cron mode: iterates all workspaces
  );
  $$
);
```

In cron mode (no `workspace_id` in body), the function iterates all distinct `workspace_id` values from `deal_scores` and generates a forecast for each.

---

## Technical Details

- **No AI call** — purely deterministic math. Fast (<300ms), zero credits.
- **INSERT not UPSERT** on `revenue_forecasts` — we keep the last N snapshots to compute trend. The hook reads `.order('generated_at', { ascending: false }).limit(2)` to get latest + previous.
- **Fallback for unscored opportunities:** `close_probability = 0.3`, `weighted_revenue = value * 0.3 * 0.4` (treated as "uncertain"). These are excluded from `best_case`.
- **`risk_index`**: When `best_case = 0` (no hot deals), `risk_index = 1.0` (maximum risk, can't know upside).
- The `RevenueIntelligenceCard` also shows a "Last generated" timestamp — if older than 24h, it shows a warning and a "Recalcular" button.
- The per-opportunity breakdown table in the Strategy page reads directly from `opportunities` + `deal_scores` join on the client — no extra DB table needed for this detail view.
- RLS: users can SELECT their workspace forecasts. Service role writes. Same pattern as `deal_scores` and `weekly_briefs`.
- `config.toml` gets a new `[functions.compute-revenue-forecast]` section (no `verify_jwt` override needed — called with user JWT from UI).

---

## Files to Create / Edit

| File | Action |
|---|---|
| `supabase/migrations/<ts>_revenue_forecasts.sql` | New — table + RLS |
| `supabase/functions/compute-revenue-forecast/index.ts` | New — computation engine |
| `supabase/config.toml` | Add function entry |
| `src/hooks/useRevenueForecast.ts` | New — React hook |
| `src/components/revenue/RevenueIntelligenceCard.tsx` | New — main UI card |
| `src/pages/StrategyPage.tsx` | Add "Receita" tab with card + table |
