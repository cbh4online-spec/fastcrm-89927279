

# Fase 2 — Revenue Brain (Intelligence que diferencia)

## Current State

### What Exists
1. **Deal Health Engine** (`deal-intelligence` edge function): Computes health_score (0-100) based on activity recency, next steps, stage stagnation, data completeness. Has caching via `deal_intelligence_cache`. Returns risk drivers, NBA, benchmarks, historical insights, automation suggestions. Works for single deal and bulk mode.

2. **Forecast** (`compute-revenue-forecast` edge function): Weighted forecast using `deal_scores` table (close_score × confidence_weights). Produces 7/30/90-day horizons, best/expected/worst case, risk_index. Stored in `revenue_forecasts` table. Dashboard shows `RevenueHero` + `ForecastTrendChart`.

3. **Intelligence Panel** (`intelligence-panel` edge function): Aggregates all open deals — health distribution, top risks, recommended actions, data quality, stage benchmarks, portfolio momentum.

4. **Proactive Suggestions** (`useProactiveAskSuggestions`): Client-side queries for stale deals (>10 days) and deals closing this week. Shows as nudges in dashboard.

5. **Ask FastCRM** (`ask-fastcrm` edge function): 2153 lines. Supports health_score/health_label as queryable fields. Already integrated.

6. **Dashboard**: `DealsAtRiskList` uses crude `confidence < 40` filter (not health engine). `PipelineHealthCard` uses `confidence_avg` from forecast, not actual health scores. `AIActionSuggestions` is static text.

### What's Missing / Weak
- **DealsAtRiskList** doesn't use the Health Engine — uses raw `confidence` field instead
- **PipelineHealthCard** doesn't use health_score — uses forecast confidence_avg
- **Health not in Lists** — filter engine doesn't support health_score (it's computed, not a column)
- **Forecast doesn't use health_score** — uses `deal_scores.close_score` separately
- **Proactive suggestions are basic** — only 2 signals (stale deals, closing this week), no health-based signals, no stage velocity alerts
- **AIActionSuggestions is static** — hardcoded text, not data-driven
- **No forecast credibility indicator** — user can't tell if forecast is realistic

## Plan

### 1. Consolidate Health Engine — Make it the single source of truth

**Upgrade `compute-revenue-forecast` edge function** to use health scores from `deal_intelligence_cache` instead of only `deal_scores`. The health_score already incorporates activity, data completeness, stage velocity — it's a better signal than `close_score` alone.

Changes:
- Fetch `deal_intelligence_cache` payloads for all open deals
- Use `health_score` as a weight factor: `health_weight = health_score / 100`
- New formula: `risk_adjusted_revenue = value × close_probability × health_weight`
- Add new fields to `revenue_forecasts`: `health_adjusted_expected`, `pipeline_health_avg` (avg health score across deals), `forecast_confidence` (composite metric: data completeness × scoring coverage × health distribution)
- Keep backward compatibility — old fields still computed

**DB Migration**: Add 3 columns to `revenue_forecasts`:
- `health_adjusted_expected` (numeric, default 0)
- `pipeline_health_avg` (numeric, default 0)
- `forecast_confidence` (numeric, default 0) — "Is my forecast realistic?" answer (0-100)

### 2. Integrate Health with Dashboard

**Replace `DealsAtRiskList` component** — Currently uses `confidence < 40`. Rewrite to use the `intelligence-panel` endpoint's `top_risks` data (already available via `useIntelligencePanel`). Show health_score badge, risk reason, and NBA action button per deal.

**Replace `PipelineHealthCard` component** — Currently derives health from `confidence_avg`. Rewrite to use `useIntelligencePanel` data: show actual health distribution (HEALTHY/WATCH/AT_RISK counts), avg_health_score, and portfolio momentum.

**Replace `AIActionSuggestions` component** — Currently static. Rewrite to use `useIntelligencePanel`'s `recommended_actions`. Each suggestion becomes an actionable button that navigates to the deal with the NBA pre-highlighted.

**Update `RevenueHero`** — Add `forecast_confidence` indicator. Show a small badge: "Alta confiança" / "Média confiança" / "Baixa confiança" based on the new `forecast_confidence` field.

### 3. Integrate Health with Lists (Filter Engine)

Health data is computed server-side, not a column on `opportunities`. To make it filterable in Lists:

**Create new hook `src/hooks/useDealsWithHealth.ts`** — Fetches open opportunities AND their bulk health scores in parallel. Returns enriched records with `health_score`, `health_label`, `top_reason` as virtual fields.

**Extend filter engine** — Add `health_score` and `health_label` as filterable fields in the opportunities list view. Since health is fetched client-side and merged, the existing `applyFilters` function works as-is — the merged records already have these fields.

**Wire into SmartContactsTable / SmartCompaniesTable** — Not applicable (health is deal-specific).

### 4. Enhanced Forecast Intelligence

**New component: `src/components/dashboard/ForecastConfidenceCard.tsx`**

Shows:
- `forecast_confidence` score (0-100) with visual gauge
- Breakdown: "X deals without value", "Y deals without close date", "Z deals at risk"
- Answer to "Is my forecast realistic?" — a clear sentence
- Stage velocity summary: which stages are slower than expected

**Update `ForecastTrendChart`** — Add the health-adjusted line alongside existing expected/best/worst. Show as a dashed line labeled "Risk-Adjusted".

### 5. Proactive Suggestions Engine (Data-Driven, Actionable)

**Upgrade `useProactiveAskSuggestions` hook** — Currently only 2 signals. Expand to 5 signal types using `useIntelligencePanel` data:

1. **Stale deals** (existing): "X deals without activity in 10+ days" → Action: "Create follow-ups"
2. **Closing this week** (existing): "X deals closing this week" → Action: "Review deals"
3. **NEW — High-value at risk**: "X high-value deals at risk" (AT_RISK + value > avg) → Action: "Review at-risk deals"
4. **NEW — Stage bottleneck**: "Stage 'Proposal' is X% slower than usual" (avg_days > expected_days × 1.5) → Action: "Review stage"
5. **NEW — Forecast drift**: Show when `health_adjusted_expected` differs > 20% from `expected_case` → Action: "Adjust forecast"

**Replace `AIActionSuggestions` with new `RevenueBrainSuggestions` component** — Uses intelligence-panel data to show dynamic, actionable cards. Each has:
- Clear message
- Severity indicator (dot color)
- Primary action button
- Link to relevant page

### 6. Wire Everything Together

**Dashboard layout update** — Replace static components with data-driven ones:
- `DealsAtRiskList` → uses intelligence-panel
- `PipelineHealthCard` → uses intelligence-panel
- `AIActionSuggestions` → becomes `RevenueBrainSuggestions`
- `RevenueHero` → adds confidence indicator

## File Summary

| File | Action | Description |
|---|---|---|
| `supabase/functions/compute-revenue-forecast/index.ts` | **EDIT** | Use health_score as weight, add health_adjusted_expected, pipeline_health_avg, forecast_confidence |
| `src/hooks/useDealsWithHealth.ts` | **NEW** | Fetch deals + bulk health scores, merge into enriched records |
| `src/hooks/useProactiveAskSuggestions.ts` | **EDIT** | Add 3 new signal types using intelligence-panel data |
| `src/components/dashboard/DealsAtRiskList.tsx` | **EDIT** | Use intelligence-panel top_risks instead of raw confidence |
| `src/components/dashboard/PipelineHealthCard.tsx` | **EDIT** | Use intelligence-panel health distribution |
| `src/components/dashboard/AIActionSuggestions.tsx` | **REWRITE** | → `RevenueBrainSuggestions` — dynamic, actionable, data-driven |
| `src/components/dashboard/RevenueHero.tsx` | **EDIT** | Add forecast confidence indicator |
| `src/components/dashboard/ForecastTrendChart.tsx` | **EDIT** | Add health-adjusted line |
| `src/components/dashboard/ForecastConfidenceCard.tsx` | **NEW** | "Is my forecast realistic?" card with breakdown |
| `src/pages/Dashboard.tsx` | **EDIT** | Wire new components, add ForecastConfidenceCard |
| **DB Migration** | **NEW** | Add 3 columns to `revenue_forecasts` |

## Technical Details

### Forecast Confidence Formula
```text
forecast_confidence = (
  data_completeness_score × 0.4 +     // avg data completeness across deals
  scoring_coverage × 0.3 +             // % of deals with deal_scores
  health_distribution_score × 0.3      // weighted: HEALTHY=1, WATCH=0.6, AT_RISK=0.2
) × 100
```

### Health-Adjusted Revenue Formula
```text
For each deal:
  health_weight = health_score / 100
  close_probability = deal_score.close_score / 100  (or 0.3 fallback)
  risk_adjusted = value × close_probability × health_weight

health_adjusted_expected = sum of all risk_adjusted values
```

### Proactive Signals Priority
```text
HIGH: high-value at risk, forecast drift > 30%
MEDIUM: stale deals > 5, stage bottleneck, closing this week
```

## What This Achieves

After implementation:
- Health Score drives forecast, lists, suggestions, and dashboard — single source of truth
- "Is my forecast realistic?" has a clear, data-backed answer
- Dashboard shows real-time, actionable intelligence instead of static text
- Lists can filter by health_score and health_label
- Proactive suggestions identify high-value risks and stage bottlenecks
- Zero AI chatbot, zero heavy dashboards — simple, clear, executable

