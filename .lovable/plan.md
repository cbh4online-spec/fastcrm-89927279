

# Ask FastCRM — Backend Setup

## Current State

The edge function `supabase/functions/ask-fastcrm/index.ts` already exists (788 lines) with all 7 intent handlers fully implemented. All referenced database tables (`deal_intelligence_cache`, `revenue_forecasts`, `opportunities`, `pipeline_stages`, `crm_activities`, `contacts`, `tasks`, `deal_scores`) already exist.

**What is missing:**

1. **`config.toml` entry** — the function is not registered, so it cannot be deployed
2. **Analytics table** — `ask_fastcrm_query_logs` for tracking usage (query submitted, intent classified, action executed) as specified in the plan

## Changes

### 1. Add config.toml entry

Append to `supabase/config.toml`:
```toml
[functions.ask-fastcrm]
verify_jwt = false
```

### 2. Database migration — `ask_fastcrm_query_logs`

Create a table to track Ask FastCRM usage for the analytics metrics defined in the plan:

```sql
CREATE TABLE public.ask_fastcrm_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  question text NOT NULL,
  intent text,
  items_count integer DEFAULT 0,
  action_executed text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ask_logs_workspace ON public.ask_fastcrm_query_logs (workspace_id, created_at DESC);

ALTER TABLE public.ask_fastcrm_query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.ask_fastcrm_query_logs
  FOR ALL USING (true) WITH CHECK (true);
```

### 3. Update edge function to log queries

Add a logging call at the end of the `ask-fastcrm` edge function (after the intent is executed and before the response is returned) to insert into `ask_fastcrm_query_logs`:

```typescript
// After executeIntent returns result
await serviceClient.from("ask_fastcrm_query_logs").insert({
  workspace_id: workspaceId,
  user_id: claimsData.claims.sub,
  question,
  intent,
  items_count: result.items?.length ?? 0,
});
```

This is non-blocking — if logging fails it should not affect the response.

### 4. Deploy and test

After deployment, test the function with a curl call to verify it classifies and responds correctly.

## Summary

| Step | Type | Description |
|---|---|---|
| 1 | Config | Register `ask-fastcrm` in config.toml |
| 2 | Migration | Create `ask_fastcrm_query_logs` table |
| 3 | Code edit | Add query logging to the edge function |
| 4 | Test | Curl the deployed function |

