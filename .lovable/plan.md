

# Intelligence Panel v1.5 — Stage Benchmarks, Historical Insights, Automation Suggestions

## Current State

- **`pipeline_stages`** table has: `id, workspace_id, name, position, color, pipeline_id, probability, description` — no `expected_days` field
- **`PipelineSettingsDialog`** lets users edit name/color per stage — no benchmark config
- **`deal-intelligence` edge function** uses a hardcoded `STAGE_LIMIT_DAYS = 14` for stagnation penalties; `intelligence-panel` copies the same `scoreDeal` logic
- **`crm_activities`** tracks `stage_changed` events with `entity_id` (the opportunity) — this gives us historical stage transition data
- **`opportunities`** has `status` (`open`, `won`, `lost`), `created_at`, `updated_at`, `stage_id` — no `closed_at` timestamp, so we use `updated_at` of won/lost deals for cycle length
- **Entity automation templates** exist in `src/data/entityAutomationTemplates.ts` with 3 opportunity templates; `useEntityAutomations` handles "Apply template" flow already
- **`deal_intelligence_cache`** stores per-deal payloads with 30-min TTL + invalidation triggers

## Plan

### 1. Database Migration — Add `expected_days` to `pipeline_stages`

Add a column directly to the existing `pipeline_stages` table:

```sql
ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS expected_days integer NOT NULL DEFAULT 14;
```

No new table needed. The `warning_multiplier` and `risk_multiplier` from the spec can be hardcoded (1.0x and 2.0x) — keeping config simple for v1.5.

### 2. Update `PipelineSettingsDialog` — Add "Expected days" field

**Edit: `src/components/crm/PipelineSettingsDialog.tsx`**

- In the stage row (both view and edit modes), add a numeric input for `expected_days`
- In view mode: show the number next to the stage name (e.g. "Proposal · 9 days")
- In edit mode: add an `<Input type="number" min={1} />` for expected days
- Add a "Reset to defaults" button that sets all stages to 14 days
- The `useUpdatePipelineStage` mutation already supports partial updates, so passing `expected_days` will work once the column exists

**Edit: `src/hooks/usePipelineStages.ts`**

- Add `expected_days` to the `PipelineStage` interface
- Add `expected_days` to `CreateStageInput` and `UpdateStageInput`

### 3. Update `scoreDeal` in both edge functions — Benchmark-aware scoring

**Edit: `supabase/functions/deal-intelligence/index.ts`**

- Remove `const STAGE_LIMIT_DAYS = 14`
- Accept `expectedDays` as parameter to `scoreDeal` (default 14 if not provided)
- Stage stagnation now uses:
  - Warning: `stage_days > expectedDays` → penalty -10
  - Risk: `stage_days > expectedDays * 2` → penalty -20
- Add "Deal momentum" signal:
  - Count activities in last 7 days
  - If ≥2 activities in last 7 days: +5 bonus (capped at 100)
  - If 0: existing penalty already covers this
- In the single-deal handler: fetch the stage's `expected_days` from `pipeline_stages`
- In the batch handler: fetch all stages for the workspace in one query, build a lookup map

**Edit: `supabase/functions/intelligence-panel/index.ts`**

- Same `scoreDeal` changes (the function has its own copy)
- Fetch `pipeline_stages` with `expected_days` for the workspace in one query
- Pass per-stage `expectedDays` when scoring each deal

### 4. Add historical insights to the deal-intelligence response

**Edit: `supabase/functions/deal-intelligence/index.ts`** (single-deal mode only)

After computing the score, add two new sections to the response:

**4a. `benchmarks` object:**
- `expected_stage_days`: from the stage config
- `avg_stage_days`: computed from `crm_activities` where `activity_type = 'stage_changed'` on other deals that passed through this stage in the last 90 days
- `deal_stage_days`: the current deal's days in stage

Query: count activities with `activity_type = 'stage_changed'` matching this stage in the workspace, compute average time between entry and exit. If insufficient data (<3 deals), fall back to the configured `expected_days`.

**4b. `historical_insights` array (max 2):**
Generate short, explainable text strings:
- If `deal_stage_days > avg_stage_days`: `"This stage usually moves in {avg} days. You're at {current}."`  severity MEDIUM if >1.5x, LOW otherwise
- If won deals exist with similar stage: `"Deals like this close in ~{avg_cycle} days on average."` severity LOW

If insufficient historical data: `"Not enough historical data yet — using configured defaults."` severity LOW

**4c. `automation_suggestions` array (max 3):**
Heuristic-based suggestions pointing to existing templates:
- No next step → template `opportunity-stage-tasks` ("Auto-create follow-up when stage changes")
- No activity in 3+ days → template `opportunity-stale-alert` ("Nudge owner after days inactive")
- Close date within 7 days + score < 50 → new template `opportunity-close-escalation` ("Escalate: close date approaching with low health")
- Deal enters "Proposal" stage → template `opportunity-stage-tasks` ("Auto-create proposal checklist")

Each suggestion: `{ title: string, template_id: string, reason: string }`

### 5. Add a new opportunity automation template

**Edit: `src/data/entityAutomationTemplates.ts`**

Add one new template to `OPPORTUNITY_AUTOMATION_TEMPLATES`:

```typescript
{
  id: 'opportunity-close-escalation',
  name: 'Escalação por Data de Fecho',
  description: 'Alerta quando data de fecho se aproxima e o score de saúde está baixo',
  entityType: 'opportunity',
  category: 'sales',
  trigger: { type: 'opportunity_updated', config: { check_close_date: true } },
  conditions: [{ field_name: 'health_score', operator: 'less_than', value: '50' }],
  actions: [
    { action_type: 'notify', config: { to: 'manager', message: 'Deal {{opportunity.name}} at risk — close date in {{days}} days' } },
    { action_type: 'create_task', config: { title: 'Review deal before close date', priority: 'high' } }
  ],
  estimatedTimeSaved: 20,
  successRate: 70,
  popularity: 75,
  icon: 'Clock',
  color: 'red'
}
```

### 6. Update `DealIntelligencePanel` — Show benchmarks + insights + suggestions

**Edit: `src/components/intelligence/DealIntelligencePanel.tsx`**

Add 3 new sections inside the collapsible content (after Risk Drivers, before Data Completeness):

**6a. Benchmarks section:**
- Show "Stage · {expected} days expected" with a small bar comparing expected vs actual
- If `deal_stage_days > expected_stage_days`: highlight in amber/red

**6b. Historical Insights section:**
- Render max 2 text lines with severity-colored left border (amber for MEDIUM, blue for LOW)
- If no insights, section is hidden

**6c. Automation Suggestions section:**
- Render max 3 compact cards: one line of text + "Apply" button
- "Apply" button calls `useApplyEntityTemplate` from `useEntityAutomations`
- Each card links the template name; clicking opens the full automation view

### 7. Update types

**Edit: `src/types/dealIntelligence.ts`**

Add to `DealIntelligencePayload`:

```typescript
benchmarks?: {
  expected_stage_days: number;
  avg_stage_days: number | null;
  deal_stage_days: number;
};
historical_insights?: Array<{
  text: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}>;
automation_suggestions?: Array<{
  title: string;
  template_id: string;
  reason: string;
}>;
```

### 8. Update `intelligence-panel` aggregated response

**Edit: `supabase/functions/intelligence-panel/index.ts`**

The overview panel gets two additions to its response:

- `stage_benchmarks`: array of `{ stage_id, stage_name, expected_days, avg_days, deals_count }` for each active stage
- `portfolio_momentum`: `{ deals_with_recent_activity: number, deals_stale: number }` (activity in last 7 days vs not)

**Edit: `src/hooks/useIntelligencePanel.ts`** — extend the interface

**Edit: `src/components/intelligence/IntelligenceOverviewPanel.tsx`** — add a "Stage Performance" section showing expected vs actual days per stage in a simple table/bar

## Files Summary

| File | Action |
|---|---|
| Database migration | **Create** — add `expected_days` column to `pipeline_stages` |
| `src/hooks/usePipelineStages.ts` | **Edit** — add `expected_days` to interfaces |
| `src/components/crm/PipelineSettingsDialog.tsx` | **Edit** — add expected days input + reset button |
| `supabase/functions/deal-intelligence/index.ts` | **Edit** — benchmark-aware scoring, momentum signal, historical insights, automation suggestions |
| `supabase/functions/intelligence-panel/index.ts` | **Edit** — benchmark-aware scoring, stage performance aggregation, momentum |
| `src/types/dealIntelligence.ts` | **Edit** — add benchmarks, insights, suggestions types |
| `src/components/intelligence/DealIntelligencePanel.tsx` | **Edit** — render benchmarks, insights, suggestion cards |
| `src/data/entityAutomationTemplates.ts` | **Edit** — add close-escalation template |
| `src/hooks/useIntelligencePanel.ts` | **Edit** — extend interface with stage benchmarks + momentum |
| `src/components/intelligence/IntelligenceOverviewPanel.tsx` | **Edit** — add Stage Performance section |

## Technical Details

- **No new tables** — `expected_days` is added directly to `pipeline_stages` with a default of 14, so existing data works immediately
- Historical insights query: `SELECT entity_id, created_at FROM crm_activities WHERE activity_type = 'stage_changed' AND workspace_id = $1 AND created_at > now() - interval '90 days'` — grouped by deal to compute average time-in-stage. Falls back to defaults if <3 data points
- Automation suggestions are purely heuristic — pattern-matching deal state against 3-4 known templates. No LLM call
- The "Apply" button reuses `useApplyEntityTemplate` which already handles creating automation rules from templates
- Cache invalidation remains unchanged — stage benchmark config changes don't invalidate deal caches (the next computation will pick up the new values naturally as caches expire)
- All text insights are short, deterministic strings — no generative AI involved

