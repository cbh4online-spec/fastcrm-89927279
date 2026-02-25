

# Sales Performance Dashboard — Attio-Level Reporting

## Current State

The existing `ReportsSales.tsx` is basic: 4 KPI cards, a horizontal pipeline bar chart, a pie chart for status distribution, proposal metrics, and ticket size. No time-series analysis, no conversion funnels, no source attribution, no quarter-over-quarter comparison.

## Proposed: Full Sales Performance Dashboard

Inspired by the Attio screenshot but enhanced with features unique to FastCRM's intelligence engine.

### Layout (6 sections)

```text
┌─────────────────────────────────────────────────────────────┐
│  Sales Performance                    [Period ▼] [↻] [+ Report] │
├─────────────────────────────────────────────────────────────┤
│ KPI Strip: 6 cards with sparklines & trends                 │
│ Pipeline Value | Won Revenue | Win Rate | Avg Cycle |       │
│ Proposals Conv | MQL→SQL Rate                               │
├──────────────────────┬──────────────────────┬───────────────┤
│ Weekly Lead Flow     │ Won Revenue by Month │ ARR Trend     │
│ by Source (stacked)  │ (bar chart)          │ (area chart)  │
├──────────────────────┴──────────────────────┴───────────────┤
│ Pipeline Conversion Funnel — This Quarter vs Last Quarter   │
│ Stage1 100% → Stage2 45% → Stage3 28% → Closed-Won 18%     │
├──────────────────────────────┬──────────────────────────────┤
│ Sales Velocity Matrix        │ Top Performers / Owners      │
│ (deals × value × win rate    │ (leaderboard with bars)      │
│  / cycle time)               │                              │
├──────────────────────────────┴──────────────────────────────┤
│ Deal Source Analysis (pie) │ Stage Duration Heatmap         │
└─────────────────────────────────────────────────────────────┘
```

### Data Sources (all from existing tables — no new DB tables needed)

| Chart | Source Table | Query |
|---|---|---|
| KPI strip | `opportunities`, `leads`, `proposals` | Aggregations with period filter |
| Weekly Lead Flow by Source | `leads` grouped by `created_at` week + `source` | Weekly buckets, last 12 weeks |
| Won Revenue by Month | `opportunities` where `status = 'closed_won'` grouped by month | Last 12 months |
| ARR/Revenue Trend | `revenue_forecasts` snapshots or `invoices` paid | Monthly totals |
| Pipeline Conversion Funnel | `opportunities` + `pipeline_stages` | Count deals that reached each stage, calculate pass-through rates |
| Quarter comparison | Same as funnel but filtered by current vs previous quarter |
| Sales Velocity | `opportunities` — formula: (deals × avg_value × win_rate) / avg_cycle_days |
| Top Performers | `opportunities` grouped by `assigned_to` with profile join |
| Source Analysis | `leads` grouped by `source` |
| Stage Duration | `opportunity_activities` or stage timestamps |

### New Hook: `useSalesPerformance`

Single hook that fetches all metrics in parallel using `Promise.all`:
- `fetchKPIs()` — 6 headline numbers with trend vs previous period
- `fetchLeadFlow()` — weekly lead counts by source (last 12 weeks)
- `fetchWonRevenue()` — monthly won revenue (last 12 months)
- `fetchARRTrend()` — monthly cumulative or snapshot revenue
- `fetchConversionFunnel(quarter)` — stage-by-stage conversion rates
- `fetchSalesVelocity()` — velocity formula components
- `fetchTopPerformers()` — ranked owners by won value
- `fetchSourceBreakdown()` — leads by source

### Components (modular, each in own file)

| Component | Description |
|---|---|
| `SalesKPIStrip` | 6 KPI cards in a row with trend badges and sparklines |
| `LeadFlowChart` | Stacked bar chart — weekly MQL/lead flow by source (like Attio) |
| `WonRevenueChart` | Bar chart — closed-won value per month |
| `ARRTrendChart` | Area chart — cumulative revenue trend |
| `ConversionFunnel` | Horizontal funnel with percentage badges between stages + quarter comparison |
| `SalesVelocityCard` | Card showing velocity formula breakdown |
| `TopPerformersCard` | Leaderboard with avatar, name, won value, deal count |
| `SourceAnalysisChart` | Donut chart with source distribution |

### File Plan

| File | Action |
|---|---|
| `src/hooks/useSalesPerformance.ts` | **NEW** — All data fetching for the sales dashboard |
| `src/components/reports/sales/SalesKPIStrip.tsx` | **NEW** — 6 KPI cards |
| `src/components/reports/sales/LeadFlowChart.tsx` | **NEW** — Stacked bar (weekly leads by source) |
| `src/components/reports/sales/WonRevenueChart.tsx` | **NEW** — Monthly won revenue bars |
| `src/components/reports/sales/ARRTrendChart.tsx` | **NEW** — Cumulative revenue area chart |
| `src/components/reports/sales/ConversionFunnel.tsx` | **NEW** — Stage conversion with quarter comparison |
| `src/components/reports/sales/SalesVelocityCard.tsx` | **NEW** — Velocity metric breakdown |
| `src/components/reports/sales/TopPerformersCard.tsx` | **NEW** — Owner leaderboard |
| `src/components/reports/sales/SourceAnalysisChart.tsx` | **NEW** — Donut by source |
| `src/pages/ReportsSales.tsx` | **REWRITE** — Compose all components into full dashboard |
| `src/i18n/locales/{pt,en,es,fr}/reports.json` | **NEW** — Translation keys for all labels |

### Enhancements Over Attio

1. **Sales Velocity formula** — Attio shows raw charts, we show the actual velocity metric with breakdown
2. **Health-aware conversion** — Funnel stages show health distribution (healthy/watch/at-risk deals at each stage)
3. **AI Insights strip** — Reuse existing `useReportAIInsights` to show contextual insights below the funnel
4. **Period comparison** — Not just "this quarter vs last" but configurable: week, month, quarter, year
5. **i18n ready** — All strings translated from day one
6. **Real data** — All queries hit existing tables (opportunities, leads, proposals, pipeline_stages, invoices)
