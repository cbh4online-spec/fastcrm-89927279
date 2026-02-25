

# Fase 2.2 — Forecast Engine V2 (Risk-Adjusted Revenue Projection)

## Current State

### What Already Exists
- **`compute-revenue-forecast` edge function**: Already computes gross, expected, worst, best case, and `health_adjusted_expected` using health scores from `deal_intelligence_cache`. Already calculates `forecast_confidence` (0-100).
- **`pipeline_stages.probability`**: Column already exists in the database (nullable, numeric). NOT used by the current forecast engine.
- **`revenue_forecasts` table**: Has `health_adjusted_expected`, `pipeline_health_avg`, `forecast_confidence` columns (added in Fase 2).
- **Dashboard**: `RevenueHero`, `ForecastTrendChart`, `ForecastConfidenceCard` already show confidence, risk-adjusted line, and data quality breakdown.
- **Ask FastCRM**: Has `forecast_summary` and `forecast_risk` intents, but `queryForecast` reads from old `payload` column format and doesn't show stage-weighted or blockers.
- **Automation triggers**: Has health-based triggers but NO forecast-specific triggers.

### What's Missing
1. **No stage-weighted forecast** — `pipeline_stages.probability` exists but is never used in computation
2. **No risk multiplier by health label** — current formula uses `health_score/100` linearly, not the tiered 0.7/0.9/1.0 approach
3. **No forecast blockers** — no structured list of what's hurting the forecast
4. **No `stage_weighted` field** in `revenue_forecasts` — only gross/expected/worst/best/health_adjusted
5. **No deal breakdown by health label** in stored forecast (healthy_revenue / watch_revenue / at_risk_revenue)
6. **Ask `queryForecast`** reads old `payload` format, doesn't show stage-weighted, blockers, or confidence
7. **No forecast automation triggers** — no `forecast_confidence_below_threshold` or `forecast_drop_percentage`
8. **`RevenueHero` doesn't show stage-weighted** — only shows expected and risk-adjusted

## Plan

### 1. DB Migration: Add stage_weighted + blockers + deal_breakdown to `revenue_forecasts`

Add columns:
- `stage_weighted` (numeric, default 0) — stage probability-weighted total
- `healthy_revenue` (numeric, default 0)
- `watch_revenue` (numeric, default 0)
- `at_risk_revenue` (numeric, default 0)
- `blockers` (jsonb, default '[]') — array of blocker strings

### 2. Upgrade `compute-revenue-forecast` Edge Function

Key changes:

**Stage probability weighting**: Fetch `pipeline_stages` with `probability` for the workspace. For each deal, lookup its stage probability (fallback 0.5 if null). Compute: `stage_weighted_value = value × stage_probability`.

**Risk multiplier by health label** (replaces linear health_score/100):
```
AT_RISK → 0.7
WATCH  → 0.9
HEALTHY → 1.0
```
`risk_adjusted = value × stage_probability × risk_multiplier`

**Confidence score V2** (spec formula):
```
confidence = 1 - (at_risk_ratio × 0.4 + no_activity_ratio × 0.3 + missing_data_ratio × 0.3)
```
Clamp 0-1, store as 0-100.

**Blockers generation**: Produce up to 5 strings describing what's hurting the forecast:
- "X high-value deals have no activity"
- "Stage Y exceeding benchmark by Z%"
- "X deals missing close date"
- "X deals at risk"
- "X deals without next step"

**Deal breakdown by health label**: Sum revenue per HEALTHY/WATCH/AT_RISK into `healthy_revenue`, `watch_revenue`, `at_risk_revenue`.

Store all new fields in `revenue_forecasts` insert.

### 3. Update Frontend Types & Hook

**`useRevenueForecast`**: Add `stage_weighted`, `healthy_revenue`, `watch_revenue`, `at_risk_revenue`, `blockers` to `RevenueForecast` interface.

### 4. Upgrade `RevenueHero`

Show 3 values in the right section instead of 2:
- **Stage-Weighted** (new, primary emphasis)
- **Risk-Adjusted** (existing, from `health_adjusted_expected`)
- **Gross** (was "Best Case")

Add a warning badge when `forecast_confidence < 60`.

### 5. Upgrade `ForecastConfidenceCard`

Add **Blockers section**: Display the blockers array from `latestForecast.blockers` as a list of short warning items. Each blocker shows with a dot severity indicator.

Add **Deal breakdown bar**: Horizontal stacked bar showing healthy/watch/at_risk revenue proportions.

### 6. Upgrade Ask FastCRM `queryForecast`

Rewrite to read the new columns directly instead of parsing old `payload` format:
- Show: gross, stage-weighted, risk-adjusted, confidence
- Show blockers as items
- Add "Is my forecast realistic?" answer based on confidence

### 7. Add Forecast Automation Triggers

Add 2 new triggers to `AutomationTrigger` type:
- `forecast_confidence_below_threshold`
- `forecast_drop_percentage`

Add to all trigger registries (AutomationRuleBuilder, VisualAutomationBuilder, AutomationRulesList, AutomationTestRunner, automationPlainLanguage).

### 8. Upgrade Proactive Suggestions

Add to `useProactiveAskSuggestions`:
- **Forecast confidence low**: When `forecast_confidence < 50` → "Your forecast confidence is low — review data quality"
- Replace existing forecast drift signal with blocker-aware version

## File Summary

| File | Action | Description |
|---|---|---|
| **DB Migration** | **NEW** | Add `stage_weighted`, `healthy_revenue`, `watch_revenue`, `at_risk_revenue`, `blockers` to `revenue_forecasts` |
| `supabase/functions/compute-revenue-forecast/index.ts` | **EDIT** | Stage probability weighting, risk multiplier by label, confidence V2 formula, blockers generation, deal breakdown |
| `src/hooks/useRevenueForecast.ts` | **EDIT** | Add new fields to `RevenueForecast` interface |
| `src/components/dashboard/RevenueHero.tsx` | **EDIT** | Show stage-weighted + risk-adjusted + gross, confidence warning |
| `src/components/dashboard/ForecastConfidenceCard.tsx` | **EDIT** | Add blockers list, deal breakdown bar |
| `src/components/dashboard/ForecastTrendChart.tsx` | **EDIT** | Add stage-weighted line to chart |
| `supabase/functions/ask-fastcrm/index.ts` | **EDIT** | Rewrite `queryForecast` to use new columns |
| `src/hooks/useAutomations.ts` | **EDIT** | Add 2 forecast triggers |
| `src/hooks/useProactiveAskSuggestions.ts` | **EDIT** | Add forecast confidence low signal |
| `src/lib/automationPlainLanguage.ts` | **EDIT** | Add 2 forecast trigger labels |
| `src/components/automations/AutomationRuleBuilder.tsx` | **EDIT** | Add 2 forecast trigger options |
| `src/components/automations/VisualAutomationBuilder.tsx` | **EDIT** | Add 2 forecast trigger options |
| `src/components/automations/AutomationRulesList.tsx` | **EDIT** | Add 2 trigger labels + colors |
| `src/components/automations/AutomationTestRunner.tsx` | **EDIT** | Add 2 trigger descriptions |

## Technical Details

### Risk-Adjusted Formula (V2)
```text
For each deal:
  stage_prob = pipeline_stages.probability ?? 0.5
  risk_mult  = AT_RISK ? 0.7 : WATCH ? 0.9 : 1.0
  
  stage_weighted_value = value × stage_prob
  risk_adjusted_value  = value × stage_prob × risk_mult

Totals:
  gross           = sum(value)
  stage_weighted  = sum(stage_weighted_value)
  risk_adjusted   = sum(risk_adjusted_value)
```

### Confidence Score V2
```text
at_risk_ratio     = at_risk_count / total_deals
no_activity_ratio = deals_no_activity_10d / total_deals
missing_data_ratio = (missing_value + missing_close_date) / (total_deals * 2)

confidence = clamp(0, 1, 1 - (at_risk_ratio × 0.4 + no_activity_ratio × 0.3 + missing_data_ratio × 0.3))
Stored as integer 0-100.
```

### Blockers (max 5)
```text
Generated in priority order:
1. "X high-value deals without activity" (value > avg && no activity > 10d)
2. "Stage 'Y' exceeding benchmark by Z%" (avg_days > expected × 1.4)
3. "X deals missing close date"
4. "X deals at risk" (AT_RISK label)
5. "X deals without next step" (no pending tasks)
```

