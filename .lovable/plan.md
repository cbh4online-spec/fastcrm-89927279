

# Add `deal_intelligence_cache` Table + Edge Function Caching

## Current State

- The `deal-intelligence` edge function computes scores on every call — no caching
- An `ai_agent_response_cache` table and `cache-manager.ts` exist for the AI agent system, but they're specific to that domain
- The deal intelligence payload is deterministic (heuristic, no LLM) so caching is straightforward
- Invalidation triggers: activity created/updated on an opportunity, task created/updated/deleted for an opportunity, opportunity itself updated

## Plan

### 1. Create `deal_intelligence_cache` table

**Database migration**

```sql
CREATE TABLE public.deal_intelligence_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  deal_id uuid NOT NULL,
  payload jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  invalidated_at timestamptz DEFAULT NULL,
  UNIQUE (workspace_id, deal_id)
);

CREATE INDEX idx_dic_workspace_deal ON public.deal_intelligence_cache (workspace_id, deal_id)
  WHERE invalidated_at IS NULL;

ALTER TABLE public.deal_intelligence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.deal_intelligence_cache
  FOR ALL USING (true) WITH CHECK (true);
```

The table stores one row per deal (upserted). `expires_at` defaults to 30 minutes. `invalidated_at` is set by triggers when underlying data changes.

### 2. Create invalidation triggers

**Same migration**

Three triggers that invalidate the cache when relevant data changes:

- **`crm_activities`**: On INSERT/UPDATE where `entity_type = 'opportunity'` → set `invalidated_at = now()` on matching `deal_id`
- **`tasks`**: On INSERT/UPDATE/DELETE where `related_type = 'opportunity'` → invalidate matching `deal_id`
- **`opportunities`**: On UPDATE → invalidate matching `deal_id`

All use one shared function:

```sql
CREATE OR REPLACE FUNCTION public.invalidate_deal_intelligence_cache()
RETURNS trigger AS $$
DECLARE
  target_deal_id uuid;
  target_workspace_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'crm_activities' THEN
    IF COALESCE(NEW.entity_type, OLD.entity_type) != 'opportunity' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    target_deal_id := COALESCE(NEW.entity_id, OLD.entity_id);
    target_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    IF COALESCE(NEW.related_type, OLD.related_type) != 'opportunity' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
    target_deal_id := COALESCE(NEW.related_id, OLD.related_id);
    target_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'opportunities' THEN
    target_deal_id := COALESCE(NEW.id, OLD.id);
    target_workspace_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  END IF;

  IF target_deal_id IS NOT NULL THEN
    UPDATE public.deal_intelligence_cache
    SET invalidated_at = now()
    WHERE deal_id = target_deal_id
      AND workspace_id = target_workspace_id
      AND invalidated_at IS NULL;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

Three trigger attachments on the public tables.

### 3. Update edge function to use cache

**Edit: `supabase/functions/deal-intelligence/index.ts`**

**Single deal flow:**
1. Before computing, query `deal_intelligence_cache` where `deal_id` matches, `invalidated_at IS NULL`, and `expires_at > now()`
2. If cache hit → return `payload` directly (skip all data fetches)
3. If cache miss → compute as today, then upsert the result into the cache table (ON CONFLICT update payload, computed_at, expires_at, clear invalidated_at)

**Batch flow:**
1. Fetch all cached entries for the requested `deal_ids` in one query
2. Separate into hits (valid cache) and misses (expired/invalidated/missing)
3. For misses only, fetch opportunities + activities + tasks and compute
4. Upsert computed results into cache
5. Merge cached + freshly computed results and return

### 4. Add `force` parameter

Both single and batch endpoints accept an optional `force: true` in the body to bypass cache (useful for manual refresh from the UI).

## Files Summary

| File | Action |
|---|---|
| Database migration | **Create** — `deal_intelligence_cache` table + invalidation triggers |
| `supabase/functions/deal-intelligence/index.ts` | **Edit** — add cache read/write logic for single + batch |

## Technical Details

- RLS policy allows full access (the edge function uses the service role client; no direct frontend access to this table)
- 30-minute TTL is a safe default for heuristic scores; triggers handle immediate invalidation on data changes
- The upsert uses `ON CONFLICT (workspace_id, deal_id)` to keep exactly one row per deal
- Batch cache lookup uses a single `.in("deal_id", ids)` query — no N+1
- Triggers use `COALESCE(NEW, OLD)` to handle INSERT, UPDATE, and DELETE uniformly
- No frontend changes needed — the API response shape stays identical

