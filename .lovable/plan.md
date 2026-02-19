
# AI Deal Scoring Module

## What This Is

A deterministic, formula-based scoring engine that computes a `close_score` (0–100) for every open opportunity by combining data from `opportunities`, `conversation_signals`, `crm_activities`, `meetings`, and `tasks`. Scores are stored in a new `deal_scores` table and surfaced as badges, sort controls, and a "Hot Deals" filter directly in the pipeline UI.

This is **separate** from the existing `ai-agent-opportunity` function (which does qualitative narrative AI analysis). This module computes a numeric score on-demand and on update — no AI LLM call required.

---

## Architecture Overview

```text
User action / mutation
        │
        ▼
[compute-deal-score edge function]
        │
        ├─ Query: opportunities (stage, value, created_at, last_activity_at)
        ├─ Query: conversation_signals (temperature, trust, churn, intent, objection)
        ├─ Query: crm_activities (response_time, meeting_booked, proposal_sent)
        ├─ Query: meetings (has upcoming meeting)
        └─ Query: tasks (pending count, overdue)
        │
        ▼
   Scoring formula (deterministic)
        │
        ▼
  UPSERT → deal_scores table
        │
        ▼
  React hook (useDealScores) reads scores
        │
        ▼
  OpportunityCard   → score badge + risk icon
  OpportunityKanban → sort by score toggle
  OpportunitiesModule → "Hot Deals" filter
  OpportunityTableView → score column
```

---

## Scope of Changes

| Layer | File | Action |
|---|---|---|
| Database | migration | Create `deal_scores` table + RLS + index |
| Edge Function | `supabase/functions/compute-deal-score/index.ts` | New: scoring logic |
| Config | `supabase/config.toml` | Register new function |
| React Hook | `src/hooks/useDealScores.ts` | Fetch scores + trigger recompute |
| UI | `src/components/opportunities/OpportunityCard.tsx` | Add score badge + risk icon |
| UI | `src/components/opportunities/OpportunityTableView.tsx` | Add score column |
| UI | `src/components/opportunities/OpportunitiesModule.tsx` | Sort + "Hot Deals" filter |
| Auto-trigger | `src/hooks/useOpportunitiesEnhanced.ts` | Trigger score after move/update |

---

## 1. Database: `deal_scores` Table

```sql
CREATE TABLE public.deal_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id  uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  close_score     numeric NOT NULL DEFAULT 0,    -- 0-100
  category        text NOT NULL DEFAULT 'uncertain', -- low/uncertain/likely/hot
  urgency         text NOT NULL DEFAULT 'normal',    -- normal/high/critical
  next_action     text,
  score_breakdown jsonb,   -- stores component scores for transparency
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id)
);

CREATE INDEX ON public.deal_scores(workspace_id, close_score DESC);
CREATE INDEX ON public.deal_scores(workspace_id, category);

ALTER TABLE public.deal_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read deal scores"
  ON public.deal_scores FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role manages deal scores"
  ON public.deal_scores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

The `score_breakdown` JSONB stores component values for debugging and display:
```json
{
  "engagement_score": 0.72,
  "recency_score": 0.85,
  "trust_score": 0.60,
  "objection_penalty": 0.20,
  "intent_score": 0.75,
  "historical_similarity": 0.50
}
```

---

## 2. Edge Function: `compute-deal-score`

**Accepts:** `{ workspace_id, opportunity_id }` — scores one opportunity.
**Auth:** Uses `SUPABASE_SERVICE_ROLE_KEY` (called server-side or via anon token from UI via `supabase.functions.invoke`).

### Data Fetched (parallel queries)

```typescript
const [opportunity, signals, activities, meetings, tasks] = await Promise.all([
  // opportunity row + stage + contact/lead
  supabase.from('opportunities').select('*, stage:pipeline_stages(*)').eq('id', opportunity_id),

  // conversation_signals by contact_id or lead_id
  supabase.from('conversation_signals')
    .select('temperature, trust_score, churn_risk, buying_intent_score, main_objection')
    .eq(contact_id ? 'contact_id' : 'lead_id', id),

  // crm_activities for this opportunity (last 30)
  supabase.from('crm_activities')
    .select('activity_type, created_at, metadata')
    .eq('opportunity_id', opportunity_id)
    .order('created_at', { ascending: false }).limit(30),

  // upcoming meetings linked to opportunity
  supabase.from('meetings')
    .select('id, start_time, status')
    .eq('opportunity_id', opportunity_id)
    .gte('start_time', new Date().toISOString())
    .eq('status', 'confirmed').limit(5),

  // open/overdue tasks linked to opportunity
  supabase.from('tasks')
    .select('id, status, due_at')
    .eq('related_id', opportunity_id)
    .eq('related_type', 'opportunity')
    .in('status', ['todo', 'in_progress']),
]);
```

### Scoring Formula

All components produce values in [0, 1]:

**engagement_score** — based on activity count and recency:
- >10 activities last 30 days → 1.0
- 5–10 → 0.7
- 2–4 → 0.4
- 0–1 → 0.1

**recency_score** — based on `last_activity_at` or `updated_at`:
- <2 days → 1.0
- 2–7 days → 0.75
- 7–14 days → 0.4
- 14–30 days → 0.15
- >30 days → 0.0

**trust_score** — directly from `conversation_signals.trust_score` (already 0–100 scaled, divide by 100). Falls back to stage probability / 100 if no signals.

**objection_penalty** — from `conversation_signals.main_objection`:
- `"none"` or null → 0.0
- `"price"` or `"competitor"` → 0.8
- `"authority"` or `"timing"` → 0.5
- `"uncertainty"` or `"confusion"` → 0.3
- `"no_need"` → 1.0

**intent_score** — composite:
- `conversation_signals.buying_intent_score` (0–1 or 0–100, normalize)
- `conversation_signals.temperature`: `ready_to_buy`→1.0, `evaluating`→0.6, `stalling`→0.3, `cold`→0.1, `lost`→0.0
- meeting booked (has upcoming confirmed meeting) → +0.15 bonus (capped at 1.0)

**historical_similarity** — based on stage probability from `pipeline_stages.probability` / 100. (Future: can use RAG. For now this is a deterministic proxy.)

**Final formula:**
```
close_score = (
  0.25 * engagement_score +
  0.20 * intent_score +
  0.20 * trust_score +
  0.15 * recency_score +
  0.10 * historical_similarity -
  0.10 * objection_penalty
) * 100
```
Clamped to [0, 100].

**Category:**
- 0–30 → `"low"`
- 31–60 → `"uncertain"`
- 61–80 → `"likely"`
- 81–100 → `"hot"`

**Urgency:**
- `churn_risk > 0.7` OR `recency_score < 0.2` → `"critical"`
- `category === "hot"` AND no upcoming meeting → `"high"`
- default → `"normal"`

**next_action logic:**
```
if hot AND no meeting scheduled        → "Agendar reunião com o cliente"
if main_objection is price/competitor  → "Enviar resposta personalizada à objeção de preço"
if recency_score < 0.2 (inactive >14d) → "Follow-up urgente — sem actividade há X dias"
if churn_risk > 0.7                    → "Escalar: risco de churn elevado"
if category is low AND stage early     → "Qualificar melhor a oportunidade"
```

### Storage

```typescript
await supabase.from('deal_scores').upsert({
  workspace_id,
  opportunity_id,
  close_score: Math.round(close_score * 10) / 10,
  category,
  urgency,
  next_action,
  score_breakdown: { engagement_score, recency_score, trust_score, objection_penalty, intent_score, historical_similarity },
  updated_at: new Date().toISOString(),
}, { onConflict: 'opportunity_id' });
```

Returns the full `deal_scores` row as JSON to the caller.

---

## 3. React Hook: `useDealScores`

```typescript
// src/hooks/useDealScores.ts

export function useDealScores() {
  // Fetches ALL deal_scores for current workspace (with opportunity_id)
  // queryKey: ["deal-scores", currentWorkspace?.id]
  // Returns: Map<opportunityId, DealScore>
}

export function useDealScore(opportunityId: string) {
  // Fetches single score for one opportunity
}

export function useComputeDealScore() {
  // useMutation: calls compute-deal-score edge function
  // invalidates ["deal-scores"] on success
  // Used both for manual refresh and auto-trigger after mutations
}
```

`DealScore` type:
```typescript
interface DealScore {
  id: string;
  opportunity_id: string;
  close_score: number;        // 0-100
  category: "low" | "uncertain" | "likely" | "hot";
  urgency: "normal" | "high" | "critical";
  next_action: string | null;
  score_breakdown: {
    engagement_score: number;
    recency_score: number;
    trust_score: number;
    objection_penalty: number;
    intent_score: number;
    historical_similarity: number;
  } | null;
  updated_at: string;
}
```

---

## 4. Auto-trigger on Opportunity Change

In `useOpportunitiesEnhanced.ts`, after successful `useMoveOpportunityEnhanced` and `useUpdateOpportunityEnhanced` mutations, call `computeDealScore` with the opportunity's id and workspace_id. This keeps scores fresh after every stage drag or field update.

Pattern (added to `onSuccess`):
```typescript
onSuccess: (data) => {
  // ... existing invalidations ...
  supabase.functions.invoke('compute-deal-score', {
    body: { workspace_id: currentWorkspace?.id, opportunity_id: data.id }
  }); // fire-and-forget, no await
}
```

---

## 5. UI Changes

### `OpportunityCard.tsx` — Score badge + risk icon

```
┌────────────────────────────────────────────────────────┐
│ ≡  Title                         €12.000  [72 Likely]  │
│                                            ⚠ (if risk) │
└────────────────────────────────────────────────────────┘
```

- Add `dealScore?: DealScore` prop
- Score badge color by category:
  - `hot` → red (`bg-red-100 text-red-700`)
  - `likely` → green (`bg-green-100 text-green-700`)
  - `uncertain` → amber (`bg-amber-100 text-amber-700`)
  - `low` → muted gray
- Risk icon (`AlertTriangle` in `text-red-500`) shown when `urgency === "critical"`
- Tooltip on hover shows `next_action` text

### `OpportunitiesModule.tsx` — Sort + Filter controls

Add two controls next to the existing filter bar:

1. **Sort by Score toggle** — `Button` with `ArrowUpDown` icon. When active, sorts `filteredOpportunities` by `close_score DESC` before grouping into Kanban columns.

2. **"Hot Deals" filter chip** — a `Badge`-style toggle button. When active, filters to show only `category === "hot"` opportunities. Shows count badge: "Hot Deals (4)".

The `useDealScores` hook is called once at the module level; the returned Map is passed down to `OpportunityKanbanColumn` → `OpportunityCard`.

### `OpportunityTableView.tsx` — Score column

Add a `Score` column between `Prob.` and `Data Fecho`:
- Shows `[72]` badge with category color
- Column header is clickable to sort by score
- Risk icon appended if `urgency === "critical"`

### `OpportunityKanbanColumn.tsx` — Column-level score metrics

Add one line to the column stats row:
- Average score for the column: `Ø Score: 64`
- Color-coded by average category

---

## Files to Create / Edit

| File | Action |
|---|---|
| `supabase/migrations/<ts>_deal_scores.sql` | New — `deal_scores` table + RLS |
| `supabase/functions/compute-deal-score/index.ts` | New — scoring edge function |
| `supabase/config.toml` | Add `[functions.compute-deal-score]` section |
| `src/hooks/useDealScores.ts` | New — React hook for scores |
| `src/components/opportunities/OpportunityCard.tsx` | Edit — score badge + risk icon |
| `src/components/opportunities/OpportunitiesModule.tsx` | Edit — sort + Hot Deals filter |
| `src/components/opportunities/OpportunityTableView.tsx` | Edit — score column |
| `src/components/opportunities/OpportunityKanbanColumn.tsx` | Edit — avg score in header |
| `src/hooks/useOpportunitiesEnhanced.ts` | Edit — auto-trigger score on move/update |

---

## Technical Details

- `deal_scores` has a `UNIQUE(opportunity_id)` constraint so UPSERT always gives one row per opportunity — no duplicates.
- The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for writing scores. The UI reads via the normal workspace client (RLS allows workspace members to SELECT).
- `conversation_signals` is linked via `contact_id` or `lead_id` on the opportunity, not directly via `opportunity_id`. The edge function resolves this by reading `opportunity.contact_id || opportunity.lead_id`.
- `meetings` table has `opportunity_id` column — confirmed in schema above. Query is straightforward.
- `tasks` uses `related_type='opportunity'` and `related_id=opportunity_id` — confirmed in schema.
- Auto-trigger from `useOpportunitiesEnhanced` is **fire-and-forget** (no `await`) so it never blocks the UI mutation.
- The hook fetches all scores for the workspace in one query (not N+1 per card), then builds a `Map<opportunityId, DealScore>` in memory for O(1) card lookups.
- `score_breakdown` is stored in the DB and will be shown in the opportunity detail page `OpportunityAIInsightsSection` as a score breakdown card (simple addition to that section, no new tab needed).
- `verify_jwt = false` is NOT needed since this function is called from authenticated UI via `supabase.functions.invoke` which passes the user's JWT.
- No AI/LLM call is made — this is a pure deterministic formula, meaning it runs fast (<200ms) and costs zero AI credits.
