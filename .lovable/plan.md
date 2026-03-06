

# FastCRM AI Kernel — Formal Orchestration Layer

## Assessment

The Kernel infrastructure is **substantially built**. The data model (12 tables), edge functions (6 kernel functions), event emission (93 files), decision engine (5 rules), action runner (7 action types), drift/impact engines, and conversation memory all exist and are functional.

**Real gaps** that prevent the Kernel from being the "mandatory orchestration layer" between modules and the Command Center:

| Gap | Impact |
|-----|--------|
| `kernel_entities` only populated via event ingestion — no normalization of owner, status, score, last_activity_at | Entity registry is incomplete |
| `kernel_events` missing `processed_at` and `status` columns | Cannot track processing state per-event |
| Decision engine missing `HOT_LEAD_UNANSWERED` and `LEAD_DROP_ALERT` rules | Lead-specific decisions absent |
| `kernel_actions_registry` missing `permission_scope`, `ui_label`, `side_effect_events` columns | Action catalog incomplete |
| `compute-impact` only operates on `context_blocks` via `context_dependencies` — not on cross-module entities via `kernel_links` | Impact propagation limited to context OS |
| No Kernel Debug Panel in the UI | No observability for operators |
| Command Center widgets still have independent fallback queries | Not fully routed through Kernel |

---

## Implementation Plan (5 Tasks)

### Task 1: Schema Hardening

**Migration** to add missing columns and structure:

```sql
-- kernel_events: add processing state
ALTER TABLE public.kernel_events
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- kernel_entities: normalize with owner, status, score, last_activity_at
ALTER TABLE public.kernel_entities
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS score FLOAT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- kernel_actions_registry: complete action catalog
ALTER TABLE public.kernel_actions_registry
  ADD COLUMN IF NOT EXISTS permission_scope TEXT DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS ui_label TEXT,
  ADD COLUMN IF NOT EXISTS side_effect_events TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS input_validation JSONB DEFAULT '{}';
```

Seed missing actions: `GENERATE_FOLLOWUP_DRAFT`, `MOVE_DEAL_STAGE`, `RECALCULATE_FORECAST`, `TRIGGER_WORKFLOW`, `OPEN_FILTERED_VIEW`.

### Task 2: Decision Engine — Add Missing Rules

**File: `supabase/functions/kernel-compute-decisions/index.ts`**

Add two new rules:

1. **HOT_LEAD_UNANSWERED** — Query `leads` with status `new`/`contacted`, `updated_at < 48h ago`, no related tasks with status `pending`/`in_progress`. Evidence: lead record + last activity timestamp.

2. **LEAD_DROP_ALERT** — Query `leads` created in last 30 days, group by week, detect >20% drop in new leads vs previous week. Evidence: weekly counts + percentage change.

Update `total_rules_checked` to 7.

### Task 3: Cross-Module Impact via kernel_links

**File: `supabase/functions/kernel-compute-impact/index.ts`** (new function, distinct from `compute-impact`)

Create `kernel-compute-impact` to traverse `kernel_links` instead of `context_dependencies`:
- BFS from changed entity through `kernel_links` (from_kind/from_id → to_kind/to_id)
- Use `confidence` as strength multiplier
- Insert results into `impact_map`
- Emit `change_events` for affected entities
- Max depth 5, min score 1 (same caps as context impact)

Update `kernel-process-events` to call this function for all event types (not just change events).

### Task 4: Entity Registry Sync

**File: `supabase/functions/kernel-ingest-event/index.ts`**

Enhance the entity upsert to extract and normalize:
- `owner_id` from payload (if present)
- `status` from payload (if present)
- `score` from payload (if present)
- `last_activity_at` set to `occurred_at` on every upsert

Update `kernel-process-events` to mark events as `processed` after dispatch:
```typescript
await supabase.from("kernel_events")
  .update({ status: "processed", processed_at: new Date().toISOString() })
  .in("id", events.map(e => e.id));
```

### Task 5: Kernel Debug Panel

**New file: `src/components/command-center/KernelDebugPanel.tsx`**

A collapsible panel (visible to workspace owners) showing:
- Last 20 `kernel_events` with status (pending/processed)
- Last 10 `kernel_action_runs` with status/error
- Last 5 `kernel_decisions` with evidence count
- Deadletter queue count from `kernel_event_deadletter`
- Workspace drift score from `drift_scores`
- Manual triggers: "Process Events", "Compute Decisions", "Compute Drift"

**New hook: `src/hooks/useKernelDebug.ts`** — fetches all debug data in parallel.

Add as a tab/section in Command Center page (behind a "Debug" toggle or at bottom of page).

---

## Files to Create/Modify

| File | Action |
|------|--------|
| New migration | Schema hardening + seed missing actions |
| `supabase/functions/kernel-ingest-event/index.ts` | Normalize entity fields on upsert |
| `supabase/functions/kernel-compute-decisions/index.ts` | Add HOT_LEAD_UNANSWERED + LEAD_DROP_ALERT rules |
| `supabase/functions/kernel-compute-impact/index.ts` | New: cross-module impact via kernel_links |
| `supabase/functions/kernel-process-events/index.ts` | Mark events processed + dispatch to kernel-compute-impact |
| `src/hooks/useKernelDebug.ts` | New: debug data fetcher |
| `src/components/command-center/KernelDebugPanel.tsx` | New: debug UI panel |
| `src/pages/CommandCenter.tsx` | Add KernelDebugPanel |

## Execution Order

1. Migration (schema + seed)
2. Entity registry sync (ingest-event + process-events)
3. Decision engine rules
4. Cross-module impact engine
5. Debug panel UI

