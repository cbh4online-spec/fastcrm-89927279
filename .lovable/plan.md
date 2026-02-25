

# Stage Duration Heatmap — Sales Performance Dashboard

## Overview

Add a visual heatmap component showing how long deals stay in each pipeline stage. Since there is no stage history/log table, the component will calculate duration from each opportunity's `created_at` vs `updated_at` for its **current stage**, giving a useful approximation of time spent.

## Data Approach

No new database tables needed. The existing `useSalesPerformance` hook already fetches both `opportunities` (with `stage_id`, `created_at`, `updated_at`, `status`) and `pipeline_stages` (with `name`, `position`, `color`, `expected_days`). The hook will be extended to compute a new `stageDuration` dataset:

For each stage, group all opportunities currently in that stage and calculate:
- **Average days** in stage (from `created_at` to `now()` for open deals, or `created_at` to `updated_at` for closed)
- **Deal count** in that stage
- **Heat intensity** — ratio of actual avg days vs `expected_days` on the stage (>1.0 = overdue = red, <0.5 = healthy = green)
- **Min/Max days** for the range indicator

## Visual Design

A horizontal heatmap grid where each row is a pipeline stage (ordered by position), and the cell color intensity reflects how much time deals spend there relative to expectations:

```text
┌─────────────────────────────────────────────────────┐
│  Stage Duration Heatmap                             │
│  Average time deals spend in each stage             │
│                                                     │
│  Qualification    ████████   4.2d avg  (12 deals)   │
│  Discovery        ██████████████  8.7d  (8 deals)   │
│  Proposal         ████████████████████  14.3d (5)    │
│  Negotiation      ██████████████  9.1d  (3 deals)   │
│  Closing          ████   2.8d avg  (2 deals)        │
│                                                     │
│  🟢 Under expected  🟡 On track  🔴 Over expected   │
└─────────────────────────────────────────────────────┘
```

Each bar is color-coded:
- **Green** — avg duration ≤ 50% of `expected_days`
- **Yellow/Amber** — avg duration between 50%-100% of `expected_days`
- **Red/Orange** — avg duration > `expected_days` (bottleneck)

Hovering a bar shows a tooltip with min, max, median, and deal count.

## File Plan

| File | Action |
|---|---|
| `src/components/reports/sales/StageDurationHeatmap.tsx` | **NEW** — Heatmap component with horizontal bars, color coding, tooltips |
| `src/hooks/useSalesPerformance.ts` | **EDIT** — Add `stageDuration` data to the return object, computed from existing opportunities + stages |
| `src/pages/ReportsSales.tsx` | **EDIT** — Import and render `StageDurationHeatmap` between the Conversion Funnel and the Velocity/Performers row |
| `src/i18n/locales/pt/reports.json` | **EDIT** — Add ~8 new keys |
| `src/i18n/locales/en/reports.json` | **EDIT** — Same keys in English |
| `src/i18n/locales/es/reports.json` | **EDIT** — Same keys in Spanish |
| `src/i18n/locales/fr/reports.json` | **EDIT** — Same keys in French |

## New i18n Keys (~8)

```
stage_duration_heatmap, stage_duration_subtitle,
stage_avg_days, stage_deals_count, stage_expected,
stage_under_expected, stage_on_track, stage_over_expected
```

## Hook Changes (useSalesPerformance.ts)

New interface and computation added to the existing query:

```typescript
export interface StageDurationData {
  stage_name: string;
  stage_color: string;
  position: number;
  avg_days: number;
  min_days: number;
  max_days: number;
  deal_count: number;
  expected_days: number;
  heat_ratio: number; // avg_days / expected_days
}
```

Logic: group open opportunities by `stage_id`, compute `differenceInDays(now, created_at)` per deal, aggregate per stage. Return sorted by stage position.

## Component Details (StageDurationHeatmap.tsx)

- Uses a Card with header + description
- Renders horizontal bars for each stage using simple divs (no external chart library needed)
- Bar width proportional to avg days (relative to the max across all stages)
- Bar color derived from `heat_ratio`: green → yellow → red gradient
- Right side shows avg days + deal count text
- Bottom legend with 3 color indicators
- Loading skeleton and empty state handled
- Fully i18n with `useTranslation("reports")`

## Dashboard Placement

In `ReportsSales.tsx`, the heatmap will be placed as a full-width card after the Conversion Funnel section:

```tsx
<ConversionFunnel data={data?.funnel} isLoading={isLoading} />
{/* NEW */}
<StageDurationHeatmap data={data?.stageDuration} isLoading={isLoading} />
{/* Existing */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <SalesVelocityCard ... />
  <TopPerformersCard ... />
</div>
```

