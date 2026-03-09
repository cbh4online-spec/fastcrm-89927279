

# Operational Decision Dashboard

## What Changes

Replace the current passive KPI dashboard with a decision-first layout that answers 4 questions on login: track status, gap to target, deals needing attention, and today's actions.

## Layout Structure

```text
┌─────────────────────────────────────────────────────┐
│ CommandCenterHeader (greeting + chips)               │
├─────────────────────────────────────────────────────┤
│ AIQuestionBox                                        │
├─────────────────────────────────────────────────────┤
│ 1. REVENUE TARGET STRIP (new component)              │
│ ┌──────────┬──────────┬──────────┬──────────────────┐│
│ │ Target   │ Closed   │ Pipeline │ Gap + Probability ││
│ └──────────┴──────────┴──────────┴──────────────────┘│
├─────────────────────────────────────────────────────┤
│ 2. EXECUTION REQUIREMENTS (new component)            │
│ "What must happen this week"                         │
│ ┌───────┬──────────┬──────────┬────────┐            │
│ │ Leads │ Meetings │Proposals │ Deals  │            │
│ │ 3/10  │ 2/8      │ 1/5      │ 0/3    │            │
│ └───────┴──────────┴──────────┴────────┘            │
├─────────────────────────────────────────────────────┤
│ 3. CONTEXT-AWARE QUICK ACTIONS (upgraded)            │
│ Shows counts: "Call 4 Hot Leads" "Follow-up 2 Props" │
├──────────────────────┬──────────────────────────────┤
│ 4. AI WEEKLY STRATEGY│ 5. DEALS AT RISK             │
│ (auto-generated)     │ (with value, days stalled,   │
│ - 3 week priorities  │  risk reason, action)        │
│ - 3 today actions    │ + consistency explanation     │
│ - 3 priority deals   │  when 0 risks but low health │
│ - 1 main risk        ├──────────────────────────────┤
│ - 1 hidden opp       │ 6. PIPELINE HEALTH           │
│                      │ (with business explanation,  │
│                      │  revenue impact, action)     │
├──────────────────────┴──────────────────────────────┤
│ 7. EXECUTIVE DAILY BRIEF (upgraded)                  │
│ yesterday summary | weekly status | risk | opp |     │
│ 3 actions for today                                  │
└─────────────────────────────────────────────────────┘
```

## Files to Create/Edit

### New Components (3 files)

1. **`src/components/weekly-dashboard/RevenueTargetStrip.tsx`**
   - Consumes `useWeeklyPerformance` data
   - Shows 4 cards: `weekly_revenue_target`, `weekly_revenue_closed`, `likely_pipeline_value` (pipeline × avg win rate), `remaining_gap` (target - closed)
   - `target_hit_probability` = (closed + pipeline × win_rate) / target as percentage
   - Color: green ≥80%, yellow ≥50%, red <50%

2. **`src/components/weekly-dashboard/ExecutionRequirements.tsx`**
   - "O que falta esta semana" header
   - For each metric (leads, meetings, proposals, deals): shows `remaining = target - actual` with progress bar
   - Remaining = 0 → green checkmark; remaining > 0 → amber/red with count

3. **`src/components/weekly-dashboard/ContextAwareQuickActions.tsx`**
   - Replaces `WeeklyQuickActions`
   - Queries real counts from DB:
     - Hot leads: `leads` where `lead_score >= 80` and no activity in 2 days
     - Meetings needed: `opportunities` without a future meeting
     - Follow-up: `proposals` with `status = 'published'` and `viewed_at IS NOT NULL` and no response
     - Stalled deals: `opportunities` with `updated_at < 7 days ago`
   - Button labels include counts: "Ligar 4 Leads Hot"
   - Uses existing navigation paths with filters

### Modified Components (4 files)

4. **`src/components/weekly-dashboard/AIStrategyPanel.tsx`**
   - Remove empty state with manual "Gerar" button
   - Show skeleton while loading
   - Restructure display: 3 week priorities, 3 today actions, 3 priority deals, 1 risk, 1 hidden opportunity
   - Requires updating the `ai-weekly-strategy` edge function tool schema to include `week_priorities`, `today_actions`, `priority_deals`, `main_risk`, `hidden_opportunity`

5. **`src/components/dashboard/DealsAtRiskList.tsx`**
   - Add columns: value, days stalled, recommended action
   - When `risks.length === 0` AND health score < 70: show consistency explanation ("Pipeline health is X% but no individual deals flagged — review data quality or stage velocity")

6. **`src/components/dashboard/PipelineHealthCard.tsx`**
   - Add `business_explanation` text based on score ranges
   - Add `revenue_impact`: calculate how much pipeline value is at risk based on AT_RISK count × avg deal value
   - Add `weekly_target_impact`: "X% of weekly target at risk"
   - Add `recommended_action` based on health score

7. **`src/components/dashboard/DailyBriefWidget.tsx`**
   - Restructure into Executive Daily Brief sections:
     - Yesterday summary (existing `summary`)
     - Weekly status line from `useWeeklyPerformance`
     - Main risk (from `hot_leads` or intelligence panel)
     - Main opportunity (from `revenue_highlight`)
     - 3 actions for today (from `action_suggestions`)

### Modified Hooks/Edge Functions (2 files)

8. **`src/hooks/useWeeklyStrategy.ts`**
   - Auto-generate on mount: add `useEffect` that calls `generate()` if no strategy exists
   - Add `hasGenerated` ref to prevent double calls

9. **`supabase/functions/ai-weekly-strategy/index.ts`**
   - Update tool schema to return structured fields: `week_priorities` (array of 3), `today_actions` (array of 3), `priority_deals` (array of 3 with id/title/value/reason), `main_risk` (string), `hidden_opportunity` (string)
   - Keep existing fields for backward compatibility

### Page Layout (1 file)

10. **`src/pages/WeeklyDashboard.tsx`**
    - Replace `WeeklyPerformanceStrip` with `RevenueTargetStrip`
    - Add `ExecutionRequirements` below strip
    - Replace `WeeklyQuickActions` with `ContextAwareQuickActions`
    - Remove manual strategy generate button (auto-generates)
    - Reorganize grid: strategy left, deals+pipeline right
    - Replace bottom grid with single `DailyBriefWidget` (full width, upgraded)
    - Remove `AIActionSuggestions` (merged into strategy panel)

## Data Dependencies

All data already available:
- `performance_targets` → targets
- `opportunities` → revenue, pipeline, stalled, won
- `leads` → lead counts, scores
- `meetings` → meeting counts
- `proposals` → proposal counts, viewed status
- `useIntelligencePanel` → health, risks, actions

No new tables needed.

## Consistency Rules (implemented in components)

- If pipeline health < 70% AND deals at risk = 0 → show explanation in DealsAtRiskList
- If remaining gap > 0 → execution requirements highlight what's missing
- All KPIs show target comparison, never isolated values
- Exception-based ordering: off-track items first, then at-risk, then on-track

## Rollout Order

1. `RevenueTargetStrip` + `ExecutionRequirements` (pure frontend, no AI)
2. `ContextAwareQuickActions` (DB queries, no AI)
3. Upgrade `DealsAtRiskList` + `PipelineHealthCard` (computed from existing data)
4. Update `ai-weekly-strategy` EF + `AIStrategyPanel` (AI + auto-generate)
5. Upgrade `DailyBriefWidget` to executive format
6. Rewire `WeeklyDashboard.tsx` layout

