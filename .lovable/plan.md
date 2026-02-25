

# Fix: Dashboards Quick Link in Reports Overview

## Problem

In `src/pages/ReportsOverview.tsx` (lines 322-337), the Dashboards link card contains duplicate content. After the correct Dashboards label, there's a second `flex-1` div with "Retenção & Churn" text and a second `ArrowUpRight` icon copied from the previous link. This causes the card to render incorrectly.

## Current (broken) code — lines 322-337

```jsx
<Link to="/dashboard/reports/dashboards" ...>
  <LayoutDashboard ... />
  <div className="flex-1">
    <p>Dashboards</p>                    // ← correct
    <p>Relatórios personalizados</p>     // ← correct
  </div>
  <ArrowUpRight ... />                   // ← correct
  <div className="flex-1">              // ← DUPLICATE from Retenção
    <p>Retenção & Churn</p>             // ← WRONG
    <p>Clientes em risco</p>            // ← WRONG
  </div>
  <ArrowUpRight ... />                   // ← DUPLICATE
</Link>
```

## Fix

Remove the duplicate `flex-1` div and second `ArrowUpRight` from inside the Dashboards link (lines 332-336).

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ReportsOverview.tsx` | Remove duplicate content inside Dashboards link (lines 332-336) |

