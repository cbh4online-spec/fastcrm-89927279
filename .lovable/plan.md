

# Fix: `compute-revenue-forecast` Edge Function Runtime Error

## Root Cause

The edge function queries `opportunities.current_stage_id` but the actual column name is `stage_id`. This causes a Postgres error on every invocation.

**Error from logs:** `column opportunities.current_stage_id does not exist`

## Fix

**File:** `supabase/functions/compute-revenue-forecast/index.ts`

- Line 66: Change `.select("id, value, expected_close_date, status, current_stage_id")` to `.select("id, value, expected_close_date, status, stage_id")`
- Line 150: Change `opp.current_stage_id` to `opp.stage_id`

Two-line fix, same file.

