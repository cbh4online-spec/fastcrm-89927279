

# Revenue Intelligence Dashboard — Weekly Performance + AI Strategy

## Overview

Replace the current `/dashboard` landing page (CommandCenter) with a new **Weekly Revenue Performance Dashboard** that shows goal progress with traffic-light indicators and AI-generated strategy to close gaps. The existing CommandCenter moves to `/dashboard/command-center`.

---

## Database

### New table: `performance_targets`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| metric_type | text | `revenue`, `leads`, `meetings`, `proposals`, `deals` |
| target_value | numeric | The target number |
| period_type | text | `weekly` / `monthly` |
| period_start | date | |
| period_end | date | |
| created_by | uuid | |
| created_at | timestamptz | |

RLS: workspace members only (read/write).

---

## Edge Function: `ai-weekly-strategy`

Receives workspace metrics (pipeline, targets, deal stages, conversion rates, activity counts) and returns structured output via tool calling:

- **Gap analysis** per metric (target vs actual, % shortfall)
- **Required activities** to close gaps
- **Risk alerts** (deals stalling, pipeline coverage < 3x)
- **Strategic recommendations** (priority deals, actions)
- **Quick action suggestions** (call hot leads, revive stalled deals)

Uses Lovable AI Gateway with `google/gemini-3-flash-preview`.

---

## New Hook: `useWeeklyPerformance`

Calculates live metrics from existing tables for the current week:

- `leads_created` — from `leads` table
- `meetings_scheduled` — from `meetings` table
- `proposals_sent` — from `proposals` table (status = published)
- `deals_won` — from `opportunities` table (status = won)
- `revenue_closed` — sum of won deal values
- `pipeline_value` — sum of open deal values
- `pipeline_coverage` — pipeline_value / revenue_target

Compares each against `performance_targets` to compute % completion and status (green/yellow/red).

---

## New Hook: `useWeeklyStrategy`

Calls `ai-weekly-strategy` edge function, caches result. Provides `generate()` and cached `strategy` object.

---

## New Page: `WeeklyDashboard.tsx`

Replaces CommandCenter as the `/dashboard` route. Layout:

### Section 1 — Header
- "Weekly Revenue Brief" title with current week dates
- Auto-generates AI strategy on mount if none exists for this week
- "Atualizar Estratégia" button

### Section 2 — Weekly Performance KPI Strip
6 cards using existing `KPICard` component with progress bars:
- Revenue Target (actual/target + gap)
- Deals Closed
- Pipeline Coverage ratio
- Meetings Scheduled
- Lead Generation
- Proposals Sent

Each card shows green/yellow/red based on % completion (>80% green, 50-80% yellow, <50% red).

### Section 3 — Two-column grid
**Left: AI Strategy Panel**
- Gap analysis summary
- Required activities list
- Strategic recommendations
- Priority deals to focus on

**Right: Pipeline Risk**
- Deals at risk (reuses existing `DealsAtRiskList`)
- Pipeline coverage ratio visualization

### Section 4 — Quick Actions
Row of action buttons:
- Call hot leads → navigate to leads filtered by hot
- Prepare meeting → create task
- Send follow-up → create task
- Revive stalled deals → navigate to stalled deals

### Section 5 — Existing widgets
Keep `AIActionSuggestions`, `DailyBriefWidget`, `PipelineHealthCard` below.

---

## Targets Settings UI

Add a "Metas Semanais" section in Settings page or as a sheet accessible from the dashboard header, allowing users to set weekly/monthly targets for each metric.

---

## Route Changes

| Route | Before | After |
|-------|--------|-------|
| `/dashboard` | CommandCenter | WeeklyDashboard |
| `/dashboard/command-center` | Redirect to /dashboard | CommandCenter (standalone) |

---

## Implementation Order

1. DB migration: `performance_targets` table + RLS
2. Edge function: `ai-weekly-strategy`
3. Hooks: `useWeeklyPerformance`, `useWeeklyStrategy`
4. Components: `WeeklyPerformanceStrip`, `AIStrategyPanel`, `WeeklyQuickActions`, `TargetsSettingsSheet`
5. Page: `WeeklyDashboard.tsx`
6. Route update in `App.tsx`

---

## Files to create/modify

- **New migration** — `performance_targets` table
- **New edge function** — `supabase/functions/ai-weekly-strategy/index.ts`
- **New hooks** — `useWeeklyPerformance.ts`, `useWeeklyStrategy.ts`
- **New components** — `src/components/weekly-dashboard/` (5-6 components)
- **New page** — `src/pages/WeeklyDashboard.tsx`
- **Modified** — `App.tsx` (route swap), `supabase/config.toml` (new function), `CommandCenter.tsx` (keep as standalone)

