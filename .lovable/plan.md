

# Deal Forecast Chart -- Sales Performance Dashboard

## Overview

Add a new chart component that visualizes projected revenue per pipeline stage, based on each stage's probability. For each stage, it shows the **total value** of deals in that stage and the **probability-weighted value** (value x stage probability), giving a clear picture of expected revenue contribution by stage.

## Data Approach

The `useSalesPerformance` hook already fetches both `opportunities` (with `value`, `stage_id`, `status`) and `pipeline_stages` (with `name`, `position`, `probability`, `color`). A new `dealForecast` dataset will be computed by grouping active opportunities by stage and calculating:

- **Total value** -- sum of all deal values in that stage
- **Weighted value** -- total value x stage probability (e.g., a stage with 60% probability and EUR10K total = EUR6K weighted)
- **Deal count** per stage

```typescript
export interface DealForecastStage {
  stage_name: string;
  stage_color: string;
  position: number;
  total_value: number;
  weighted_value: number;
  probability: number;
  deal_count: number;
}
```

## Visual Design

A horizontal grouped bar chart (using Recharts `BarChart`) showing two bars per stage:
- **Full bar** (lighter) -- total pipeline value in that stage
- **Weighted bar** (solid) -- probability-adjusted value

```text
┌──────────────────────────────────────────────────┐
│  Deal Forecast by Stage                          │
│  Projected revenue based on pipeline probability │
│                                                  │
│  Qualification  ████████████  (20%)   €12K → €2.4K
│  Discovery      ██████████████ (40%)  €14K → €5.6K
│  Proposal       ████████████████ (60%) €16K → €9.6K
│  Negotiation    ██████████ (80%)       €10K → €8K
│  Closing        ████ (90%)             €4K → €3.6K
│                                                  │
│  Total Weighted: €29.2K                          │
│  ▨ Total Value   ■ Weighted Value                │
└──────────────────────────────────────────────────┘
```

## File Plan

| File | Action |
|---|---|
| `src/components/reports/sales/DealForecastChart.tsx` | **NEW** -- Bar chart component with total vs weighted bars per stage |
| `src/hooks/useSalesPerformance.ts` | **EDIT** -- Add `dealForecast` computation from existing data, add to return |
| `src/pages/ReportsSales.tsx` | **EDIT** -- Import and render between Stage Duration Heatmap and Velocity row |
| `src/i18n/locales/en/reports.json` | **EDIT** -- Add ~6 keys |
| `src/i18n/locales/pt/reports.json` | **EDIT** -- Same |
| `src/i18n/locales/es/reports.json` | **EDIT** -- Same |
| `src/i18n/locales/fr/reports.json` | **EDIT** -- Same |

## New i18n Keys (~6)

```
deal_forecast_chart, deal_forecast_subtitle,
deal_forecast_total, deal_forecast_weighted,
deal_forecast_probability, deal_forecast_total_weighted
```

## Hook Changes

In `useSalesPerformance.ts`, after the stage duration calculation, add:

```typescript
const dealForecast: DealForecastStage[] = allStages.map((stage) => {
  const stageOpps = activeOpps.filter(o => o.stage_id === stage.id);
  const totalValue = stageOpps.reduce((s, o) => s + (o.value || 0), 0);
  const prob = (stage.probability || 0) / 100;
  return {
    stage_name: stage.name,
    stage_color: stage.color || "hsl(var(--primary))",
    position: stage.position,
    total_value: totalValue,
    weighted_value: totalValue * prob,
    probability: stage.probability || 0,
    deal_count: stageOpps.length,
  };
}).filter(s => s.deal_count > 0).sort((a, b) => a.position - b.position);
```

## Component Details

- Uses `BarChart` with `layout="vertical"` from Recharts (consistent with existing charts)
- Two bars: lighter opacity for total value, solid primary for weighted
- Y-axis shows stage names, X-axis shows currency values
- Tooltip shows stage name, probability %, total value, weighted value, deal count
- Footer shows total weighted pipeline sum
- Loading skeleton and empty state
- Fully i18n via `useTranslation("reports")`

## Dashboard Placement

Between the Stage Duration Heatmap and the Velocity/Performers grid:

```tsx
<StageDurationHeatmap data={data?.stageDuration} isLoading={isLoading} />
<DealForecastChart data={data?.dealForecast} isLoading={isLoading} />
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <SalesVelocityCard ... />
  <TopPerformersCard ... />
</div>
```

