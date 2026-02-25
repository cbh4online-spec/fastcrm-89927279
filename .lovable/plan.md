

# Fase 2.4 — Multi-Pipeline Intelligence Engine

## Current State

### What Exists
- **`pipelines` table**: id, name, workspace_id, is_default, type. Stages linked via `pipeline_stages.pipeline_id`.
- **`opportunities` table**: Has `stage_id` (not direct `pipeline_id`). Pipeline is resolved via `pipeline_stages.pipeline_id` JOIN.
- **`deal_intelligence_cache`**: Per-deal health scores with `health_score`, `health_label`, `stage_days`, `last_activity_days` in payload.
- **`revenue_forecasts`**: Workspace-level (not per-pipeline). Has `forecast_confidence`, `stage_weighted`, `healthy_revenue`, `watch_revenue`, `at_risk_revenue`, `blockers`.
- **`compute-revenue-forecast`**: Computes for entire workspace, no pipeline_id segmentation.
- **`intelligence-panel`**: Aggregates health distribution for workspace, not per-pipeline.
- **Navigation**: No "Revenue Overview" route. Closest is "Intelligence" (`/dashboard/intelligence`).
- **Ask**: Has `pipeline_summary` intent but only shows stage breakdown for all deals, no multi-pipeline comparison.

### What's Missing
1. **No per-pipeline aggregation** — all intelligence is workspace-level
2. **No pipeline comparison** — no way to see health/risk/confidence side by side
3. **No multi-pipeline edge function** — would need to aggregate health cache + forecast data grouped by pipeline
4. **No Revenue Overview page** — no executive multi-pipeline UI
5. **No multi-pipeline Ask intents** — can't ask "which pipeline is riskier"
6. **No velocity index** — no actual_stage_days / expected_stage_days ratio per pipeline

## Plan

### 1. New Edge Function: `multi-pipeline-intelligence`

Pure aggregation engine (no AI). Receives `workspace_id`, returns structured comparison.

**Data flow**:
1. Fetch all pipelines for workspace
2. Fetch pipeline_stages with expected_days, probability
3. Fetch open opportunities with stage_id + value
4. Fetch deal_intelligence_cache for all open deals
5. Fetch latest revenue_forecasts for workspace (forecast_confidence)
6. Group by pipeline_id (via stage → pipeline mapping)

**Per-pipeline metrics computed**:
- `health_index` = avg(health_score) of active deals
- `risk_ratio` = at_risk_count / total_active_deals
- `velocity_index` = avg(actual_stage_days / expected_stage_days)
- `revenue_share` = pipeline_total_value / workspace_total_value
- `deal_count` = total active deals
- `total_value` = sum of deal values
- `forecast_confidence` = per-pipeline confidence using same V2 formula

**Insight generation** (deterministic, up to 5):
- Pipeline with highest risk_ratio → "X pipeline shows highest risk ratio (Y%)"
- Pipeline with velocity_index > 1.2 → "X pipeline is slower than benchmark"
- Revenue concentration > 60% → "Revenue concentrated in X (Y%)"
- Pipeline with confidence < 50 → "X pipeline has low forecast confidence"
- Best performing pipeline → "X pipeline is healthiest"

**Guardrails**: Skip pipelines with < 5 active deals.

### 2. Frontend Hook: `useMultiPipelineIntelligence`

Hook to call the edge function and cache results (5 min stale time).

Returns:
```typescript
interface PipelineIntelligence {
  pipeline_id: string;
  name: string;
  health_index: number;
  risk_ratio: number;
  forecast_confidence: number;
  velocity_index: number;
  revenue_share: number;
  deal_count: number;
  total_value: number;
}

interface MultiPipelineIntelligence {
  pipelines: PipelineIntelligence[];
  insights: string[];
  generated_at: string;
}
```

### 3. Revenue Overview Page

New page: `src/pages/RevenueOverviewPage.tsx` at route `/dashboard/revenue`.

**Section 1 — Pipeline Comparison Cards**: One card per pipeline showing health index (color-coded), risk ratio, forecast confidence, revenue share, deal count. Clean grid layout.

**Section 2 — Visual Comparisons**: Two horizontal bar charts using Recharts:
- Health Index comparison (green/yellow/red gradient)
- Forecast Confidence comparison

**Section 3 — Executive Insights**: List of 3-5 auto-generated insight strings with severity icons.

### 4. Navigation Update

Add "Revenue" to `NAV_V2_ITEMS` between "Intelligence" and "Reports", with `TrendingUp` icon.

### 5. Ask Integration

Add new intent `pipeline_comparison` to `ask-fastcrm`:
- Keywords: "which pipeline", "riskier pipeline", "pipeline comparison", "revenue concentrated", "pipeline slowing"
- Handler queries the same data as the edge function inline
- Returns comparison headline + per-pipeline items + insights

### 6. Dashboard Teaser

Add a compact `PipelineComparisonCard` to the Dashboard right sidebar (below ForecastConfidenceCard). Shows mini health bars for each pipeline with a "View full comparison" link to `/dashboard/revenue`.

## File Summary

| File | Action | Description |
|---|---|---|
| `supabase/functions/multi-pipeline-intelligence/index.ts` | **NEW** | Aggregation engine: per-pipeline health, risk, velocity, revenue share, insights |
| `src/hooks/useMultiPipelineIntelligence.ts` | **NEW** | Hook to call edge function, cache 5 min |
| `src/pages/RevenueOverviewPage.tsx` | **NEW** | Executive multi-pipeline comparison page |
| `src/components/dashboard/PipelineComparisonCard.tsx` | **NEW** | Compact dashboard teaser card |
| `src/config/nav.v2.ts` | **EDIT** | Add "Revenue" nav item |
| `src/App.tsx` | **EDIT** | Add `/dashboard/revenue` route |
| `src/pages/Dashboard.tsx` | **EDIT** | Add PipelineComparisonCard to right sidebar |
| `supabase/functions/ask-fastcrm/index.ts` | **EDIT** | Add `pipeline_comparison` intent + handler |
| `supabase/config.toml` | **EDIT** | Add `multi-pipeline-intelligence` function config |

## Technical Details

### Per-Pipeline Aggregation Logic
```text
1. stages = SELECT id, pipeline_id, expected_days FROM pipeline_stages WHERE workspace_id = X
2. stage_to_pipeline = Map(stage_id → pipeline_id)
3. opps = SELECT id, stage_id, value, status FROM opportunities WHERE workspace_id = X AND status = 'open'
4. health = SELECT deal_id, payload FROM deal_intelligence_cache WHERE workspace_id = X

For each opp:
  pipeline_id = stage_to_pipeline[opp.stage_id]
  health_data = health[opp.id]
  
  Group into pipeline buckets:
    - sum values
    - sum health_scores, count
    - count at_risk
    - collect stage_days / expected_days ratios

Per pipeline (if deal_count >= 5):
  health_index = round(total_health / count)
  risk_ratio = round(at_risk / count, 2)
  velocity_index = round(avg(stage_days / expected_days), 2)
  revenue_share = round(pipeline_value / total_value, 2)
  confidence = V2 formula per pipeline subset
```

### Insight Generation (deterministic, no AI)
```text
Rules evaluated in order, max 5 insights:
1. If any pipeline risk_ratio > 0.3 → "X shows high risk (Y% deals at risk)"
2. If any pipeline velocity_index > 1.2 → "X is moving Z% slower than benchmark"
3. If any pipeline revenue_share > 0.6 → "Revenue concentrated: Y% in X"
4. If any pipeline confidence < 50 → "X has low forecast confidence (Y%)"
5. Best pipeline by health_index → "X is your healthiest pipeline (score Y)"
```

### No DB Migration Needed
All data already exists in `deal_intelligence_cache`, `pipeline_stages`, `opportunities`, and `pipelines`. The edge function performs pure aggregation with no new tables.

