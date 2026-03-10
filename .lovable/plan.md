

# Plan: WeeklyDashboard — Complete i18n, Settings & Export

## Current State

The main dashboard components (`PipelineHealthCard`, `DealsAtRiskList`, `DailyBriefWidget`, `TodayActionPlan`, `ExecutionRequirements`) are already internationalized. However, **5 components still have hardcoded Portuguese strings**:

| Component | Hardcoded strings |
|---|---|
| `RevenueTargetStrip.tsx` | ~15 (labels, status, progress bar) |
| `PriorityDealsTable.tsx` | ~10 (title, empty state, risk reasons, tooltips) |
| `AIStrategyPanel.tsx` | ~8 (section titles) |
| `ContextAwareQuickActions.tsx` | ~4 (button labels) |
| `TargetsSettingsSheet.tsx` | ~10 (labels, toast, metric names) |

Additionally, the **conversion ratios and health weights are not yet configurable** by the user, and there are **no export buttons** on the priority/risk tables.

---

## Changes

### 1. Add ~50 new translation keys to `dashboard.json` (4 locales)

Keys for all remaining hardcoded strings across the 5 components above. Examples:
- `warRoomSituation`, `reachable`, `atRiskStatus`, `criticalStatus`, `weeklyTarget`, `closedRevenue`, `likelyPipeline`, `remainingGap`, `ofTarget`, `progressToTarget`, `closed`, `likely`, `gap`
- `priorityDeals`, `noPriorityDeals`, `noPriorityDealsHint`, `daysInactive`, `noCloseDate`, `hotDealClose`, `highValueFocus`, `openDeal`, `callAction`, `followUpAction`
- `aiWeeklyStrategy`, `weekPriorities`, `actionsForToday`, `gapAnalysis`, `mainRiskTitle`, `hiddenOpportunity`, `loadingStrategy`
- `callHotLeads`, `scheduleMeeting`, `sendFollowUp`, `reactivateDeals`
- `targets`, `weeklyTargets`, `saveTargets`, `targetsUpdated`, `conversionRatios`, `leadToMeeting`, `meetingToProposal`, `proposalToDeal`, `healthWeights`, `stalledWeight`, `missingDataWeight`, `coverageWeight`

### 2. i18n refactor of 5 components

Add `useTranslation("dashboard")` and replace all hardcoded strings with `t()` calls in:
- `RevenueTargetStrip.tsx`
- `PriorityDealsTable.tsx`
- `AIStrategyPanel.tsx`
- `ContextAwareQuickActions.tsx`
- `TargetsSettingsSheet.tsx`

### 3. Conversion Ratios & Health Weights in Settings

Expand `TargetsSettingsSheet` with two new collapsible sections:
- **Conversion Ratios**: 3 percentage inputs (lead→meeting, meeting→proposal, proposal→deal) saved to `performance_targets` with `metric_type` = `conversion_lead_to_meeting` etc.
- **Health Score Weights**: 3 inputs for stagnation/missing data/coverage weights.

Update `ExecutionRequirements` and `PipelineHealthCard` to read these values from the DB (via a shared hook or inline query), falling back to the existing constants.

### 4. CSV/PDF Export on Priority Deals and Deals at Risk

Add small export buttons (CSV via `papaparse`, PDF via `jspdf`) to `PriorityDealsTable` and `DealsAtRiskList` headers. Columns: deal title, value, status, risk reason, days inactive.

---

## Files to Edit
- `src/i18n/locales/{pt,en,es,fr}/dashboard.json` — ~50 new keys each
- `src/components/weekly-dashboard/RevenueTargetStrip.tsx` — i18n
- `src/components/weekly-dashboard/PriorityDealsTable.tsx` — i18n + CSV/PDF export
- `src/components/weekly-dashboard/AIStrategyPanel.tsx` — i18n
- `src/components/weekly-dashboard/ContextAwareQuickActions.tsx` — i18n
- `src/components/weekly-dashboard/TargetsSettingsSheet.tsx` — i18n + conversion ratios + health weights sections
- `src/components/weekly-dashboard/ExecutionRequirements.tsx` — read workspace conversion ratios
- `src/components/dashboard/PipelineHealthCard.tsx` — read workspace health weights
- `src/components/dashboard/DealsAtRiskList.tsx` — CSV/PDF export

## Execution Order
1. Translation keys (all 4 locales)
2. i18n refactor of 5 components
3. Settings expansion (conversion ratios + health weights)
4. Export buttons

