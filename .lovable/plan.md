

# Intelligence Panel v1 — Deal Health & Next Best Action

## Current State

- **OpportunityDetailPage** renders a `flex-col-reverse lg:flex-row` layout with a right sidebar (w-80) for Associations + Commission sections
- **Existing AI**: `OpportunityAIInsightsSection` and `deal_scores` table exist but use a different model (edge function `compute-deal-score` with engagement/recency/trust/intent factors). This is separate from the heuristic health score described here
- **Activities**: `crm_activities` table with `entity_type`, `entity_id`, `created_at` — can filter by `entity_type='opportunity'`
- **Tasks**: `tasks` table with `related_type`, `related_id`, `due_at`, `status` — can filter by `related_type='opportunity'`
- **Opportunities**: has `value`, `expected_close_date`, `contact_id`, `company_id`, `stage_id`, `last_activity_at`, `updated_at`
- **Pipeline stages**: `pipeline_stages` with `position`, `name`
- **No tasks hook** exists yet — need to create one

## Architecture Decision

The plan calls for an "Intelligence Service" edge function. However, for v1 with a deterministic heuristic (no AI/LLM calls), all scoring logic can run **client-side** in a custom hook. This gives:
- Zero latency (no network call)
- Instant updates when data changes
- Simpler implementation
- Easy to swap for an edge function in v2

The hook will consume data already fetched by the detail page (opportunity, activities, tasks, stages) and compute the score purely in-memory.

## Plan

### 1. Deal Intelligence Hook

**New file: `src/hooks/useDealIntelligence.ts`**

Pure computation hook that takes opportunity data + activities + tasks + stages and returns:

```text
{
  healthScore: number (0-100)
  healthLabel: "healthy" | "watch" | "at_risk"
  riskDrivers: { reason: string, severity: "high" | "medium" | "low" }[]
  nextBestAction: { title: string, type: "follow_up" | "create_task" | "review_blockers" | "complete_data" | "send_recap" }
  dataCompleteness: { percent: number, missingFields: string[] }
}
```

Scoring logic (from the spec):
- Start at 100, subtract penalties for: no recent activity (-25/-40), no next task (-20/-10), stage stagnation (-15/-25), missing data (-10/-10/-5)
- Labels: 80-100 Healthy, 50-79 Watch, 0-49 At Risk
- Risk drivers: top 3 penalties sorted by severity
- NBA: first matching rule (no activity → follow up, no next step → create task, stagnated → review blockers, incomplete → complete data, else → send recap)

### 2. Tasks Hook

**New file: `src/hooks/useTasks.ts`**

Fetches tasks from the `tasks` table filtered by `related_type` and `related_id`. Also provides a `useCreateTask` mutation for the NBA CTA.

### 3. Intelligence Panel Component

**New file: `src/components/intelligence/DealIntelligencePanel.tsx`**

A collapsible card/panel with 4 sections:

**A) Health Score** — Circular badge (green/amber/red) + label + one-line reason
**B) Risk Drivers** — Top 3 items with severity badges (High/Medium/Low)
**C) Next Best Action** — Single recommendation with CTA button. "Create task" opens inline task creation (title pre-filled, linked to deal)
**D) Data Completeness** — Progress bar + list of missing fields as clickable suggestions

Styling: compact, no long text. Uses existing `Card`, `Badge`, `Progress`, `Button` components.

### 4. Integration into Deal Detail View

**Edit: `src/components/opportunities/OpportunityDetailPage.tsx`**

Add `DealIntelligencePanel` to the right sidebar (above or below Associations), passing the opportunity, activities, tasks, and stages data.

### 5. Health Badge in Deals List

**New file: `src/components/intelligence/DealHealthBadge.tsx`**

A small badge component that takes an opportunity + its activities/tasks and shows the health label with a tooltip showing the top risk reason.

**Edit: `src/components/opportunities/OpportunitiesModule.tsx`** (or the table columns config)

Add a "Health" column to the deals table view that renders `DealHealthBadge` for each row.

For the list view, we need a lightweight version: fetch activities and tasks in bulk for all visible deals. To avoid N+1 queries:

**New file: `src/hooks/useBulkDealIntelligence.ts`**

Fetches all activities and tasks for a list of opportunity IDs in two queries, then computes health scores for each deal client-side.

### 6. Create Task from Intelligence Panel

The NBA CTA "Create task" will:
1. Open a small inline form (or dialog) with pre-filled title from the NBA recommendation
2. Set `related_type: 'opportunity'`, `related_id: dealId`
3. Set `due_at` to 48h from now (for follow-ups)
4. On success, invalidate tasks query and show toast

### 7. Analytics Events (lightweight)

Track events via `crm_activities` table (reuse existing activity logging):
- `intelligence_panel_opened` — logged when panel mounts
- `nba_clicked` — logged when user clicks the NBA CTA
- `task_created_from_intelligence` — logged on successful task creation

No new table needed — just activity entries with `activity_type` set accordingly.

## Files Summary

| File | Action |
|---|---|
| `src/hooks/useDealIntelligence.ts` | Create — heuristic scoring logic |
| `src/hooks/useTasks.ts` | Create — tasks CRUD for deals |
| `src/hooks/useBulkDealIntelligence.ts` | Create — batch scoring for list view |
| `src/components/intelligence/DealIntelligencePanel.tsx` | Create — sidebar panel with 4 sections |
| `src/components/intelligence/DealHealthBadge.tsx` | Create — compact badge for list view |
| `src/components/intelligence/CreateTaskFromIntelligence.tsx` | Create — inline task creation dialog |
| `src/components/opportunities/OpportunityDetailPage.tsx` | Edit — add panel to sidebar |
| `src/components/opportunities/OpportunitiesModule.tsx` | Edit — add Health column to table view |

## Technical Notes

- All scoring runs client-side in v1 — no edge function needed. Data is already fetched by the page
- Stage stagnation uses `opportunity.updated_at` as proxy (no stage history table yet). Default stage limit: 14 days
- `useBulkDealIntelligence` fetches activities/tasks for all visible deal IDs in 2 queries (using `.in()` filter), then maps scores per deal
- The panel is collapsible via a simple `useState` toggle with localStorage persistence
- No new DB tables or migrations needed — uses existing `tasks`, `crm_activities`, `opportunities`, `pipeline_stages`

