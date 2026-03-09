

# Tier 1 Event Test Matrix

## Overview
Create a test cases registry table, insert comprehensive test cases for all 21 Tier 1 events (5 test types each = 105 rows), and build an admin diagnostics page.

## Step 1 — Database Migration

Create `event_test_cases` table with RLS policies for authenticated users.

```sql
CREATE TABLE public.event_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  test_name text NOT NULL,
  test_type text NOT NULL, -- valid_payload, invalid_payload, conditional_branch, idempotency, failure_path
  input_payload jsonb NOT NULL DEFAULT '{}',
  expected_signal text,
  expected_decision text,
  expected_action text,
  expected_result text NOT NULL, -- accept, reject, skip, error
  priority text NOT NULL DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_run_status text, -- pass, fail, skipped
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Step 2 — Insert 105 Test Cases

For each of the 21 events, insert 5 test types:

| Test Type | Purpose | Expected Result |
|-----------|---------|-----------------|
| `valid_payload` | Full valid payload → signal + decision + action | `accept` |
| `invalid_payload` | Missing required keys → runtime failure logged | `reject` |
| `conditional_branch` | Edge case (e.g., score=0, stage unchanged) → skipped action | `skip` |
| `idempotency` | Duplicate idempotency_key → second event ignored | `skip` |
| `failure_path` | Action execution fails → error logged in deadletter | `error` |

Each row includes realistic `input_payload` matching the `minimum_payload_json` from the decision matrix.

## Step 3 — Admin UI Page

**Route:** `/dashboard/system/event-tests`

**File:** `src/pages/EventTestsPage.tsx`

**Layout:**
- **Stats row:** Total tests, pass rate, failing events, coverage %
- **Filters:** by test_type, event_name domain prefix, status
- **Table columns:** event_name, test_name, test_type, expected_signal, expected_decision, expected_action, expected_result, last_run_status
- **Color coding:** pass=green, fail=red, skipped=yellow, never_run=gray

Uses existing `DashboardLayout`, `PageHeader`, shadcn Table, Badge components — same pattern as `EventMatrixPage.tsx`.

## Step 4 — Route Registration

Add lazy import and route in `src/App.tsx` alongside the existing system routes.

## Files to Create/Edit

| File | Action |
|------|--------|
| Migration SQL | Create `event_test_cases` table + RLS |
| Data insert | 105 test case rows via insert tool |
| `src/pages/EventTestsPage.tsx` | New admin diagnostics page |
| `src/App.tsx` | Add route `/dashboard/system/event-tests` |

