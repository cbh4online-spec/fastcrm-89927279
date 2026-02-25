

# Reorganize Reports Overview Cards Layout

## Problem

The current layout has an awkward 3-column grid at the bottom where:
- The Pie Chart sits alone in 1 column (too narrow)
- AI Insights + Scenarios span 2 columns
- Quick Links + Metrics Governance float in a third column below

This creates unbalanced visual weight, with the pie chart cramped and the quick links pushed far down.

## New Layout

```text
┌──────────────────────────────────────────────────┐
│  KPI Strip (6 cards)                             │
├─────────────────────────┬────────────────────────┤
│  Revenue Trend (line)   │  Pipeline by Stage     │
├─────────────────────────┼────────────────────────┤
│  Lead Sources (pie)     │  Cenários "E se..."    │
├─────────────────────────┴────────────────────────┤
│  AI Insights (full width, horizontal cards)      │
├──────────┬──────────┬──────────┬─────────────────┤
│  Quick Link 1  │  QL 2  │  QL 3  │  QL 4        │
├──────────┴──────────┴──────────┴─────────────────┤
│  Métricas Governadas (full width banner)         │
└──────────────────────────────────────────────────┘
```

## Changes to `src/pages/ReportsOverview.tsx`

### Row 1: Charts (unchanged)
- Revenue Trend + Pipeline by Stage in `grid-cols-2` — stays the same.

### Row 2: Pie + Scenarios (new 2-col grid)
- Move the Lead Sources pie chart and Cenários card into a `grid-cols-2` row, giving the pie chart proper space.

### Row 3: AI Insights (full width)
- AI Insights becomes a full-width card with insight cards displayed in a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) instead of stacked vertically.

### Row 4: Quick Links (horizontal grid)
- Convert the Quick Links from a vertical list into a `grid-cols-2 lg:grid-cols-4` card grid, each link being its own small card with icon, title, and subtitle.

### Row 5: Metrics Governance (full width banner)
- Stays as a full-width info banner at the bottom.

### Summary
- Remove the awkward 3-column grid (lines 326-521)
- Replace with 4 cleaner sections: pie+scenarios row, insights row, quick links grid, governance banner
- No new components or data — just restructuring the existing cards

