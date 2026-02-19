
# Strategic Intelligence Engine — Weekly Executive Brief

## Overview

This is a full-stack feature with 5 layers:
1. Database table for storing historical weekly briefs
2. Backend Edge Function that aggregates data + calls AI
3. Automatic weekly cron schedule (pg_cron)
4. React hook for data access
5. "Strategy" page + Sidebar menu item

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  pg_cron  (every 7 days)                                │
│       │                                                 │
│       ▼                                                 │
│  Edge Function: strategic-intelligence-brief            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 1. Query DB for all workspaces with active subs  │   │
│  │ 2. For each workspace:                           │   │
│  │    a. Aggregate leads, opps, tasks, messages     │   │
│  │    b. Compute % changes vs prior 7-day period    │   │
│  │    c. Extract message patterns (objections, etc) │   │
│  │    d. Call Lovable AI (gemini-3-flash-preview)   │   │
│  │    e. Save result to strategic_briefs table      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Also called on-demand from UI (manual "Generate")      │
└─────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐
│  /dashboard/strategy  (new page)  │
│  ┌─────────────────────────────┐  │
│  │  Weekly Executive Brief     │  │
│  │  - Summary paragraph        │  │
│  │  - Key Metrics (4 cards)    │  │
│  │  - Opportunity / Risk /     │  │
│  │    Market Signal chips      │  │
│  │  - 5 Priority Actions       │  │
│  │  - "Create Tasks" button    │  │
│  │  - History list             │  │
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

---

## Files to Create / Edit

| File | Action |
|---|---|
| `supabase/migrations/<ts>_strategic_briefs.sql` | Create `strategic_briefs` table + RLS |
| `supabase/functions/strategic-intelligence-brief/index.ts` | New Edge Function |
| `supabase/config.toml` | Register function (verify_jwt = false for cron) |
| `src/hooks/useStrategicBriefs.ts` | React hook: fetch + generate on-demand |
| `src/pages/StrategyPage.tsx` | New page |
| `src/components/layout/Sidebar.tsx` | Add "Estratégia" menu group |
| `src/App.tsx` | Register `/dashboard/strategy` route |

---

## 1. Database: `strategic_briefs` table

```sql
CREATE TABLE strategic_briefs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_start  timestamptz NOT NULL,  -- start of the 7-day window analysed
  period_end    timestamptz NOT NULL,  -- end of the 7-day window analysed
  summary       text NOT NULL,
  opportunity   text,
  risk          text,
  market_signal text,
  priority_actions jsonb NOT NULL DEFAULT '[]',
  key_metrics   jsonb NOT NULL DEFAULT '{}',
  raw_data      jsonb,                 -- optional: store the raw aggregated data
  generated_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON strategic_briefs(workspace_id, generated_at DESC);

ALTER TABLE strategic_briefs ENABLE ROW LEVEL SECURITY;

-- Members of the workspace can read their briefs
CREATE POLICY "workspace members can read briefs"
  ON strategic_briefs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Only service role (cron) can insert/update
CREATE POLICY "service role manages briefs"
  ON strategic_briefs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

The `key_metrics` column stores:
```json
{
  "leads_change": 12.5,
  "revenue_change": -4.0,
  "conversion_change": 3.1,
  "response_time_change": -8.2,
  "leads_total": 23,
  "won_deals": 4,
  "lost_deals": 2,
  "tasks_completed": 11,
  "tasks_pending": 7,
  "messages_total": 156
}
```

---

## 2. Edge Function: `strategic-intelligence-brief`

The function accepts two modes:
- **Cron mode** (no body): iterates over all workspaces, generates brief for each, stores to DB
- **On-demand mode** (body `{ workspace_id }`): generates and stores a brief for that specific workspace, returns it immediately to the caller

### Data Aggregation (per workspace, last 7 days vs prior 7 days)

Queries made with the **service role** client:

| Data source | What we collect |
|---|---|
| `leads` | count created, count inactive > 7 days |
| `opportunities` | count created, won, lost; sum of `value` for won |
| `opportunity_history` / `opportunities.updated_at` | stage movement count |
| `messages` | total, inbound/outbound split, last 100 content snippets for pattern analysis |
| `crm_activities` | count per type |
| `tasks` | completed vs pending |
| `marketing_campaigns` | sends and replies (if table exists) |

### AI Prompt Design

Uses **`google/gemini-3-flash-preview`** with a structured tool-call for guaranteed JSON output:

```
System: "Você é um analista executivo de negócios. 
         Analise dados de CRM dos últimos 7 dias e produza
         um relatório executivo semanal estruturado.
         Seja específico, use os números fornecidos,
         identifique padrões reais."

User:   [aggregated data block]

Tool:   generate_executive_brief(
          summary, opportunity, risk, market_signal,
          priority_actions[5], key_metrics
        )
```

---

## 3. Cron Schedule

Using the `insert` tool (not migration) since it contains project-specific URL/key:

```sql
SELECT cron.schedule(
  'strategic-intelligence-weekly',
  '0 6 * * 1',   -- every Monday at 06:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/strategic-intelligence-brief',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

## 4. React Hook: `useStrategicBriefs`

```ts
useStrategicBriefs() → {
  briefs: StrategicBrief[],       // historical list, newest first
  latestBrief: StrategicBrief | null,
  isLoading: boolean,
  isGenerating: boolean,
  generateBrief: () => Promise<void>,  // calls edge fn on-demand
}
```

---

## 5. UI: Strategy Page (`/dashboard/strategy`)

Layout mirrors `GrowthInsightsModule.tsx` pattern:

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Estratégia Semanal"   [Gerar Relatório] button    │
├──────────────────┬──────────────────────────────────────────┤
│  Key Metrics     │  4 cards: Leads Δ, Revenue Δ,            │
│  (top row)       │  Conversion Δ, Response Time Δ           │
├──────────────────┴──────────────────────────────────────────┤
│  Executive Summary (full-width prose card)                  │
├─────────────────┬───────────────────┬───────────────────────┤
│  Opportunity    │  Risk             │  Market Signal         │
│  (green card)   │  (red card)       │  (blue card)           │
├─────────────────┴───────────────────┴───────────────────────┤
│  5 Priority Actions                                          │
│  [numbered list with "Criar Tarefa" button per action]       │
│  [Criar Todas como Tarefas] button                          │
├─────────────────────────────────────────────────────────────┤
│  Histórico (accordion, shows past briefs)                   │
└─────────────────────────────────────────────────────────────┘
```

**"Create Tasks" behavior:** Each priority action can be turned into a task using `useCreateTask()`. The "Create All" button creates all 5 tasks at once with due_at set to 7 days from now.

---

## 6. Sidebar

Add a new group before "Relatórios" in `Sidebar.tsx`:

```ts
{
  name: "Estratégia",
  icon: Telescope,   // or BrainCircuit from lucide
  tooltip: "Inteligência estratégica semanal",
  highlight: true,
  items: [
    { name: "Brief Executivo", href: "/dashboard/strategy", icon: FileBarChart2, highlight: true },
  ],
}
```

---

## Technical Details

- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` (available automatically in edge functions as `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`) to query data cross-workspace for the cron mode, and a user-authenticated client for on-demand mode.
- The first call on-demand shows a loading skeleton; if no brief exists yet, the page shows an empty state with a "Gerar Primeiro Relatório" CTA.
- The cron runs every Monday at 06:00 UTC; the UI also allows manual regeneration at any time.
- Historical briefs are stored indefinitely (one per generation); the UI shows the last 8 in an accordion.
- The `priority_actions` column is stored as `jsonb` array of strings, making it easy to iterate and create tasks.
- RLS ensures users can only read briefs for workspaces they belong to; the cron uses service role to write.
- Message pattern analysis uses the last 100 message bodies (content field) clustered into themes by the AI — no extra DB queries needed beyond the existing `messages` table query.
- The `opportunity_history` table may not exist; the function falls back to checking `opportunities.updated_at` changes if that table is absent.
