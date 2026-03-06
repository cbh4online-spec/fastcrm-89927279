

# AI-Analytics — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Revenue Forecast Generation | `useRevenueForecast.ts` | None | None |
| Edge: compute-revenue-forecast | `compute-revenue-forecast/index.ts` | None | Bare `console.error` |
| Multi-Pipeline Intelligence | `useMultiPipelineIntelligence.ts` | None | None |
| Edge: multi-pipeline-intelligence | `multi-pipeline-intelligence/index.ts` | None | Bare `console.error` |
| Funnel AI Insights | Edge: `funnel-ai-insights/index.ts` | None | Bare `console.error` |
| Dashboard Insights | Edge: `ai-dashboard-insights/index.ts` | None | Bare `console.error` |
| Forecasts Reports | `useForecastsReports.ts` | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | No `revenue_forecasts` or `deal_scores` analytics checks |

Zero kernel events across the entire analytics module. All edge functions use bare `console.error` without standardized prefixes. No risk signal or forecast update events exist.

## Implementation Plan

### A) Kernel Events (source: `ai-analytics`)

**`compute-revenue-forecast/index.ts`:**
1. On successful forecast insert → `FORECAST.UPDATED` (entity_kind: `revenue_forecast`, payload: `expected_case`, `forecast_confidence`, `opportunity_count`, `risk_index`)
2. On high risk detected (risk_index > 0.5 or at_risk_count > 0) → `RISK.SIGNAL_DETECTED` (entity_kind: `revenue_forecast`, payload: `risk_index`, `at_risk_count`, `blockers`)

**`multi-pipeline-intelligence/index.ts`:**
3. On successful response → `FORECAST.PIPELINE_ANALYZED` (entity_kind: `pipeline`, payload: `pipeline_count`, `insights_count`)
4. On high-risk pipeline detected (risk_ratio > 0.3) → `RISK.SIGNAL_DETECTED` (entity_kind: `pipeline`, payload: `pipeline_name`, `risk_ratio`, `health_index`)

**`useRevenueForecast.ts` (`useGenerateRevenueForecast`):**
5. `onSuccess` → `FORECAST.UPDATED` (entity_kind: `revenue_forecast`, source_module: `ai-analytics`)

**`useMultiPipelineIntelligence.ts`:**
6. No mutation — read-only hook, skip events (edge function handles it)

### B) Logging (prefix: `[AI-ANALYTICS]`)

**`compute-revenue-forecast/index.ts`:** Replace bare `console.error` with `[AI-ANALYTICS]` prefix; add success log with model inputs summary (opportunity_count, scored_count, health_count, forecast_confidence)

**`multi-pipeline-intelligence/index.ts`:** Replace bare `console.error` with `[AI-ANALYTICS]`; add success log with pipeline count and insights count

**`funnel-ai-insights/index.ts`:** Replace bare `console.error` with `[AI-ANALYTICS]`

**`ai-dashboard-insights/index.ts`:** Replace bare `console.error` with `[AI-ANALYTICS]`

**`useRevenueForecast.ts`:** Add `[AI-ANALYTICS]` logging on generate success/error

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `revenue_forecasts` (module: `ai-analytics`)

## File Plan

| File | Action |
|------|--------|
| `supabase/functions/compute-revenue-forecast/index.ts` | Emit `FORECAST.UPDATED` + `RISK.SIGNAL_DETECTED` via `kernel_events` insert; add `[AI-ANALYTICS]` prefix; log model inputs summary on success |
| `supabase/functions/multi-pipeline-intelligence/index.ts` | Emit `FORECAST.PIPELINE_ANALYZED` + conditional `RISK.SIGNAL_DETECTED`; add `[AI-ANALYTICS]` prefix |
| `supabase/functions/funnel-ai-insights/index.ts` | Align to `[AI-ANALYTICS]` prefix |
| `supabase/functions/ai-dashboard-insights/index.ts` | Align to `[AI-ANALYTICS]` prefix |
| `src/hooks/useRevenueForecast.ts` | Import `emitKernelEvent`; emit `FORECAST.UPDATED` on generate success; add `[AI-ANALYTICS]` logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `revenue_forecasts` check under `ai-analytics` module |

