

# Add Charts to Reports Overview Page

## Problem

The `/dashboard/reports` page (ReportsOverview) only shows KPI number cards, text-based AI insights, and navigation links. There are no visual charts or graphs, making the overview feel incomplete compared to the sub-pages (e.g., ReportsSales) which have full Recharts visualizations.

## Solution

Add 3 summary charts to `ReportsOverview.tsx` using data already fetched by the existing hooks (`useSalesPerformance`, `useRevenueMetrics`). These charts provide a quick visual snapshot without requiring users to navigate into sub-pages.

### Charts to Add

1. **Revenue Trend (Line Chart)** — Monthly won revenue over the last 12 months, using `useSalesPerformance().wonRevenueByMonth`. A simple area/line chart showing the revenue trajectory.

2. **Pipeline by Stage (Horizontal Bar Chart)** — Current active deals grouped by pipeline stage, using `useSalesPerformance().dealForecast`. Shows total value and weighted value per stage.

3. **Lead Sources (Donut/Pie Chart)** — Breakdown of lead sources, using `useSalesPerformance().sourceBreakdown`. A PieChart showing where leads come from.

### Layout

```text
┌──────────────────────────────────────────────────┐
│  KPI Strip (6 cards) — already exists            │
├──────────────────────────────────────────────────┤
│  Revenue Trend (line)  │  Pipeline by Stage (bar)│
├────────────────────────┼─────────────────────────┤
│  Lead Sources (pie)    │  AI Insights (existing) │
├────────────────────────┼─────────────────────────┤
│  Scenarios (existing)  │  Quick Links (existing) │
└────────────────────────┴─────────────────────────┘
```

## Changes

### `src/pages/ReportsOverview.tsx`

- Import `useSalesPerformance` hook (already exists, provides all needed data)
- Import Recharts components: `LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend`
- Add 3 new `<Card>` sections with charts between the KPI strip and the existing insights section:
  1. **Revenue Trend Card** — `<LineChart>` with `wonRevenueByMonth` data, area fill gradient, formatted Y-axis with `€` currency
  2. **Pipeline by Stage Card** — `<BarChart layout="vertical">` with `dealForecast` data showing `total_value` and `weighted_value` bars side by side, colored by stage
  3. **Lead Sources Card** — `<PieChart>` with `sourceBreakdown` data, using a predefined color palette, with labels showing percentage
- Rearrange the existing content into a better grid layout that accommodates the new charts
- Add loading skeletons for the chart cards
- Handle empty state (no data) with a centered message

### No new files needed

All data hooks already exist. All chart components use Recharts (already installed). Only `ReportsOverview.tsx` needs modification.

### Color Palette for Pie Chart

```typescript
const CHART_COLORS = [
  "hsl(217, 91%, 60%)",  // blue
  "hsl(142, 76%, 36%)",  // green
  "hsl(38, 92%, 50%)",   // amber
  "hsl(280, 67%, 55%)",  // purple
  "hsl(0, 84%, 60%)",    // red
  "hsl(190, 80%, 45%)",  // teal
];
```

