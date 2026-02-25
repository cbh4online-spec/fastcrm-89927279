

# Fase 2.1 — Health Engine V2 (Revenue-Grade)

## Current State Analysis

### What Exists
- **`deal-intelligence` edge function** (513 lines): Scores deals 0-100 with penalties for activity recency, next steps, stage stagnation, data completeness. Has momentum bonus (+5). Single deal + batch mode. Cache via `deal_intelligence_cache` with 30min TTL and trigger-based invalidation (activities, tasks, opportunities).
- **`intelligence-panel` edge function** (387 lines): Duplicates the `scoreDeal` function. Aggregates health distribution, top risks, recommended actions, stage benchmarks.
- **`pipeline_stages.expected_days`**: Already exists (default 14). Used by `deal-intelligence` for stage velocity.
- **`deal_intelligence_cache`**: Table with workspace_id, deal_id, payload (jsonb), computed_at, expires_at, invalidated_at. Triggers invalidate on activity/task/opportunity changes.
- **Automation triggers**: `AutomationTrigger` type has ~45 triggers but NO health-related triggers (no `health_label_changed`, `health_score_below_threshold`).
- **`useDealsWithHealth` hook**: Merges opportunities with bulk health scores for list filtering.

### What's Missing for V2
1. **No `pipeline_stage_benchmarks` table** — stage velocity uses `pipeline_stages.expected_days` only, no `risk_multiplier` or `warning_multiplier`
2. **No value sensitivity** — high-value deals penalized same as low-value
3. **Penalty thresholds not configurable** — hardcoded in `scoreDeal`
4. **No health history** — can't track score deterioration over time
5. **No automation triggers for health** — can't trigger on `health_label_changed` or `health_score_dropped`
6. **Duplicated `scoreDeal`** — exists in both `deal-intelligence` AND `intelligence-panel`
7. **No confidence metric** on health score itself (data quality signal)
8. **30-day activity penalty gap** — jumps from -40 (>14d) to nothing for >30d (spec says -60)

## Plan

### 1. Database: `pipeline_stage_benchmarks` table + Health History

**New table: `pipeline_stage_benchmarks`**
```
pipeline_id    uuid NOT NULL
stage_id       uuid NOT NULL (FK → pipeline_stages)
expected_days  integer NOT NULL DEFAULT 14
warning_multiplier numeric DEFAULT 1.0
risk_multiplier    numeric DEFAULT 1.5
PRIMARY KEY (pipeline_id, stage_id)
```
This allows per-pipeline, per-stage velocity tuning. The edge function will prefer this table over `pipeline_stages.expected_days` when present.

**New table: `health_score_history`**
```
id             uuid PK
workspace_id   uuid NOT NULL
deal_id        uuid NOT NULL
health_score   integer NOT NULL
health_label   text NOT NULL
top_reason     text
recorded_at    timestamptz DEFAULT now()
```
Index on `(workspace_id, deal_id, recorded_at DESC)`. RLS: service role only. Populated by the edge function on each fresh computation. Enables "worsening score" detection for proactive suggestions and automation triggers.

**New table: `health_engine_config`**
```
id                     uuid PK
workspace_id           uuid NOT NULL UNIQUE
label_thresholds       jsonb DEFAULT '{"healthy": 80, "watch": 50}'
value_sensitivity_threshold numeric DEFAULT 50000
value_sensitivity_multiplier numeric DEFAULT 1.2
```
Global configuration per workspace for label cutoffs and value sensitivity.

### 2. Edge Function: Upgrade `deal-intelligence` scoring engine

Refactor `scoreDeal` to V2 with these changes:

**Activity penalties (aligned to spec)**:
- >30 days: -60 (HIGH)
- >14 days: -40 (HIGH)  
- >7 days: -25 (HIGH)

**Stage velocity (pipeline-aware)**:
- Fetch `pipeline_stage_benchmarks` for the deal's pipeline
- Fallback to `pipeline_stages.expected_days` if no benchmark row
- `stage_days > expected × risk_multiplier` → -20 (HIGH)
- `stage_days > expected × warning_multiplier` → -10 (MEDIUM)

**Value sensitivity**:
- If deal value > `health_engine_config.value_sensitivity_threshold`, multiply all penalties by `value_sensitivity_multiplier` (default 1.2)

**Configurable labels**:
- Read `health_engine_config.label_thresholds` for the workspace
- Fallback to HEALTHY ≥ 80, WATCH ≥ 50, AT_RISK < 50

**Confidence output**:
- Add `confidence` field (0-1) = data_completeness / 100 × (has recent activity ? 1 : 0.7) × (has tasks ? 1 : 0.8)

**Health history recording**:
- On each fresh computation, INSERT into `health_score_history`
- Detect label changes by comparing to last recorded entry → add `label_changed` flag to output

**Deduplicate scoreDeal**:
- Remove the duplicated `scoreDeal` from `intelligence-panel/index.ts`
- Have `intelligence-panel` call `deal-intelligence` in batch mode instead of re-implementing scoring

### 3. Automation Triggers: Health-based

**Add 3 new trigger types** to `AutomationTrigger`:
- `health_label_changed` — fires when label transitions (e.g., WATCH → AT_RISK)
- `health_score_below_threshold` — fires when score drops below configured value
- `health_score_dropped` — fires when score drops by X points from previous

**Implementation**: The `deal-intelligence` function, after computing and detecting a label change (via `health_score_history`), will insert a record into `automation_trigger_events` (or call the automation execution engine directly). The existing automation execution engine picks it up.

**UI**: Add the 3 new triggers to the automation builder's trigger dropdown for opportunity-type automations.

### 4. Lists Integration Enhancement

The `useDealsWithHealth` hook already works. Enhance it to also expose:
- `stage_days` (from intelligence payload debug)
- `last_activity_days` (from intelligence payload debug)

These become filterable virtual fields in opportunity list views.

### 5. Ask Integration

Already integrated — `ask-fastcrm` supports `health_score` and `health_label` as queryable fields. No changes needed.

### 6. UI: Health Engine Config page

**New component: `src/components/settings/HealthEngineSettings.tsx`**

Simple settings card under pipeline settings:
- Label thresholds (HEALTHY/WATCH cutoff sliders)
- Value sensitivity threshold (input)
- Value sensitivity multiplier (input)
- Per-stage benchmark table (inline edit expected_days, warning_multiplier, risk_multiplier)

Accessible from pipeline settings page.

## File Summary

| File | Action | Description |
|---|---|---|
| **DB Migration** | **NEW** | Create `pipeline_stage_benchmarks`, `health_score_history`, `health_engine_config` tables |
| `supabase/functions/deal-intelligence/index.ts` | **EDIT** | V2 scoring: 3-tier activity, pipeline benchmarks, value sensitivity, configurable labels, confidence, history recording, label change detection |
| `supabase/functions/intelligence-panel/index.ts` | **EDIT** | Remove duplicated `scoreDeal`, call `deal-intelligence` batch mode instead |
| `src/hooks/useAutomations.ts` | **EDIT** | Add 3 health trigger types to `AutomationTrigger` |
| `src/hooks/useDealsWithHealth.ts` | **EDIT** | Expose `stage_days`, `last_activity_days` from cached payloads |
| `src/types/dealIntelligence.ts` | **EDIT** | Add `confidence`, `label_changed`, `stage_days` to payload types |
| `src/components/settings/HealthEngineSettings.tsx` | **NEW** | Config UI for thresholds, value sensitivity, stage benchmarks |
| `src/pages/PipelineSettingsPage.tsx` (or equivalent) | **EDIT** | Add link/tab to Health Engine settings |

## Technical Details

### V2 Score Formula
```text
base = 100

// Activity (mutually exclusive, worst wins)
if last_activity_days > 30: penalty += 60
elif last_activity_days > 14: penalty += 40
elif last_activity_days > 7:  penalty += 25

// Next step
if no_pending_tasks: penalty += 20
elif next_due > 7 days: penalty += 10

// Stage velocity (pipeline-aware)
benchmark = pipeline_stage_benchmarks[pipeline_id, stage_id] 
         ?? pipeline_stages.expected_days ?? 14
if stage_days > benchmark.expected × risk_multiplier: penalty += 20
elif stage_days > benchmark.expected × warning_multiplier: penalty += 10

// Data completeness
if !amount: penalty += 10
if !close_date: penalty += 10
if !contact: penalty += 5

// Value sensitivity
if value > config.value_sensitivity_threshold:
  penalty = penalty × config.value_sensitivity_multiplier

// Momentum bonus
if activities_last_7d >= 2: bonus = 5

score = clamp(0, 100, base - penalty + bonus)
```

### Label Change Detection
```text
1. Compute new score
2. SELECT health_label FROM health_score_history 
   WHERE deal_id = X ORDER BY recorded_at DESC LIMIT 1
3. If previous_label != new_label → label_changed = true
4. INSERT new entry into health_score_history
5. If label_changed → queue automation trigger
```

### Intelligence Panel Deduplication
```text
Current: intelligence-panel has its own scoreDeal (duplicated)
After: intelligence-panel calls deal-intelligence batch endpoint internally
       via service-to-service HTTP call using SUPABASE_URL + service role key
```

