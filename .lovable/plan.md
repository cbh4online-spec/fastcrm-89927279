
# Strategic Intelligence Engine — Weekly Executive Brief

## What This Does

The user is providing the exact schema for the `weekly_briefs` table and wants the full Strategic Intelligence Engine module implemented. This was approved in an earlier plan but never built. The Conversation Intelligence Engine (AI Deal Insight) was built; now we complete the **other half**: the automated weekly executive brief.

---

## Scope of Work

| Layer | Action |
|---|---|
| Database migration | Create `weekly_briefs` table with the user's exact schema + RLS |
| Edge Function | `strategic-intelligence-brief` — aggregates workspace data + AI + saves brief |
| Cron schedule | Auto-run every Monday at 06:00 UTC via pg_cron |
| React hook | `useStrategicBriefs` — fetch history + on-demand generate |
| Strategy Page | `/dashboard/strategy` — tabbed page with "Brief Executivo" + "Deal Intelligence" |
| Sidebar | Add "Estratégia" group with "Brief Executivo" item |
| App.tsx | Register `/dashboard/strategy` route |

---

## 1. Database: `weekly_briefs` Table

Using the user's exact schema, with added RLS policies and a foreign key on `workspace_id`:

```sql
CREATE TABLE public.weekly_briefs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at       timestamptz DEFAULT now(),
  summary          text,
  opportunity      text,
  risk             text,
  market_signal    text,
  priority_actions jsonb,
  key_metrics      jsonb
);

CREATE INDEX ON public.weekly_briefs(workspace_id, created_at DESC);

ALTER TABLE public.weekly_briefs ENABLE ROW LEVEL SECURITY;

-- Workspace members can read their briefs
CREATE POLICY "workspace members read weekly briefs"
  ON public.weekly_briefs FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Service role (edge function / cron) can write
CREATE POLICY "service role manages weekly briefs"
  ON public.weekly_briefs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

The `key_metrics` jsonb stores: `{ leads_change, revenue_change, conversion_change, response_time_change, leads_total, won_deals, lost_deals, messages_total, tasks_completed, tasks_pending }`.

The `priority_actions` jsonb stores an array of 5 strings: `["action 1", "action 2", ...]`.

---

## 2. Edge Function: `strategic-intelligence-brief`

**Accepts:** `{ workspace_id? }` — if omitted in cron mode, iterates all workspaces.

**Processing per workspace:**

1. Query **last 7 days** vs **prior 7 days** for:
   - `leads` table → count created, count with no activity > 7 days
   - `opportunities` table → created, won, lost; sum of value for won deals
   - `messages` table → count total, sample last 60 messages for pattern analysis
   - `tasks` table → completed vs pending
2. Compute percentage changes between periods
3. Build message context for AI (last 60 message bodies for signal extraction)
4. Call `google/gemini-2.5-flash` with tool-calling to produce the structured brief
5. Insert result into `weekly_briefs` table

**AI tool schema:**
```json
{
  "name": "generate_weekly_brief",
  "parameters": {
    "summary": "string — 2-3 sentence executive summary",
    "opportunity": "string — biggest opportunity detected",
    "risk": "string — biggest risk detected",
    "market_signal": "string — market signal from messages",
    "priority_actions": ["string x5"],
    "key_metrics": {
      "leads_change": "number",
      "revenue_change": "number",
      "conversion_change": "number",
      "response_time_change": "number"
    }
  }
}
```

6. Return the generated brief to caller (for on-demand mode)

---

## 3. Cron Schedule (pg_cron)

Inserted via the **insert tool** (data operation, not migration):
```sql
SELECT cron.schedule(
  'strategic-intelligence-weekly',
  '0 6 * * 1',
  $$SELECT net.http_post(...)$$
);
```

This runs every Monday at 06:00 UTC and generates a brief for every workspace automatically.

---

## 4. React Hook: `useStrategicBriefs`

```typescript
useStrategicBriefs(workspaceId: string) → {
  briefs: WeeklyBrief[],         // history, newest first
  latestBrief: WeeklyBrief | null,
  isLoading: boolean,
  isGenerating: boolean,
  generateBrief: () => Promise<void>,
}
```

Fetches from `weekly_briefs` where `workspace_id = currentWorkspace.id`, ordered by `created_at DESC`, limit 12 (3 months of history).

`generateBrief()` calls the edge function with the workspace_id and invalidates the query.

---

## 5. Strategy Page (`/dashboard/strategy`)

Two tabs: **Brief Executivo** and **Deal Intelligence**.

### Tab 1: Brief Executivo

```
┌──────────────────────────────────────────────────────────────┐
│  Header: "Estratégia Semanal"    [🔄 Gerar Relatório button]  │
├──────────────────────────────────────────────────────────────┤
│  Key Metrics (4 cards, top row)                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Leads Δ  │ │Revenue Δ │ │Convert.Δ │ │ Resp.Time Δ  │   │
│  │  +12.5%  │ │  -4.0%   │ │  +3.1%   │ │  -8.2%       │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  Executive Summary (prose card, full width)                  │
├─────────────────┬─────────────────┬────────────────────────┤
│  Oportunidade   │  Risco          │  Sinal de Mercado      │
│  (green card)   │  (red card)     │  (blue card)           │
├──────────────────────────────────────────────────────────────┤
│  5 Ações Prioritárias                                        │
│  1. [action text]        [Criar Tarefa]                      │
│  2. [action text]        [Criar Tarefa]                      │
│  3. [action text]        [Criar Tarefa]                      │
│  4. [action text]        [Criar Tarefa]                      │
│  5. [action text]        [Criar Tarefa]                      │
│                          [Criar Todas as Tarefas]            │
├──────────────────────────────────────────────────────────────┤
│  Histórico (last 8 briefs in accordion)                      │
└──────────────────────────────────────────────────────────────┘
```

Empty state when no briefs exist: "Ainda não há dados suficientes. Clique em **Gerar Relatório** para criar o primeiro brief executivo semanal."

### Tab 2: Deal Intelligence

Aggregated workspace-level view from `conversation_signals` table (already populated by the Conversation Intelligence Engine):
- Temperature distribution chart (cold/evaluating/ready_to_buy/stalling/lost)
- Average close probability across all contacts
- Top 3 main objections (bar chart using recharts)
- List of top 10 contacts/leads sorted by close probability descending

---

## 6. Sidebar — "Estratégia" Group

Add a new `NavGroup` between "Relatórios" and "Ferramentas" in `Sidebar.tsx`:

```typescript
{
  name: "Estratégia",
  icon: BrainCircuit,
  tooltip: "Inteligência estratégica e negocial",
  highlight: true,
  items: [
    {
      name: "Brief Executivo",
      href: "/dashboard/strategy",
      icon: FileBarChart2,
      tooltip: "Relatório executivo semanal com IA",
      highlight: true,
    },
  ],
}
```

Also add `"Brief Executivo": "strategy"` to the `menuKeyMap`.

---

## 7. App.tsx Route

Add inside the protected dashboard routes:
```tsx
import StrategyPage from "./pages/StrategyPage";
// ...
<Route path="strategy" element={<StrategyPage />} />
```

---

## Files to Create / Edit

| File | Action |
|---|---|
| `supabase/migrations/<ts>_weekly_briefs.sql` | Create `weekly_briefs` table + RLS |
| `supabase/functions/strategic-intelligence-brief/index.ts` | New edge function |
| `supabase/config.toml` | Register `strategic-intelligence-brief` |
| `src/hooks/useStrategicBriefs.ts` | New React hook |
| `src/pages/StrategyPage.tsx` | New Strategy page (2 tabs) |
| `src/components/layout/Sidebar.tsx` | Add "Estratégia" group |
| `src/App.tsx` | Add `/dashboard/strategy` route |

---

## Technical Details

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` (auto-available in Deno edge functions) to read from all workspace tables and write to `weekly_briefs`.
- On-demand calls from the UI pass `{ workspace_id }` in the body; the function generates a brief for that workspace only and returns it immediately.
- Cron mode (called with no body) fetches all workspace IDs and iterates, generating a brief per workspace. This is fire-and-forget from the cron perspective.
- The `priority_actions` array is stored as `jsonb` — the UI iterates it to render each action and the "Criar Tarefa" button passes it to the existing task creation hook.
- "Criar Tarefa" sets `due_at` to 7 days from now and uses the action text as the task title.
- The Deal Intelligence tab reads from the existing `conversation_signals` table — no new queries needed, just aggregate counts.
- Metric change cards use green/red color coding: positive change in leads/revenue/conversion = green, negative = red; for response_time_change the inverse applies (lower time = green).
- The history accordion shows the brief date, a one-line summary preview, and expands to show the full brief for trend comparison.
- `verify_jwt = false` in config.toml for `strategic-intelligence-brief` since it's called by pg_cron (no JWT available in cron context).
