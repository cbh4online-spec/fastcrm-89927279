

# Kernel Event Layer Validation Plan

## Current State Assessment

### 1. Event Emission Consistency
- **105 files** emit kernel events via `emitKernelEvent()` across all major modules (CRM, Companies, Leads, Decisions, Briefs, FastMatch, etc.)
- The emitter is fire-and-forget with error suppression (`console.warn` only)
- The `kernel-ingest-event` edge function inserts into `kernel_events` and upserts `kernel_entities`
- **Issue found**: No validation that all critical CRUD operations emit events. Some modules may have gaps.

### 2. Realtime Subscriptions -- NOT ENABLED
- **Critical finding**: None of the kernel tables have realtime enabled. No migrations add `kernel_events`, `kernel_entities`, `kernel_action_runs`, `change_events`, or `context_blocks` to `supabase_realtime`.
- **No Supabase channels** are used anywhere in the frontend (`supabase.channel()` has zero matches). All data is fetched via polling (`useQuery` with `refetchInterval` or manual refetch).
- The "Live Feed" card is **not actually live** — it polls `change_events` with default React Query stale time.

### 3. Live Feed Throttling
- `KernelLiveFeedCard` fetches 5 `change_events` via `useChangeEvents(5)` and shows them. No throttling or deduplication exists. If realtime were enabled, rapid events would cause excessive re-renders.

### 4. Kernel Actions Filtering
- `useKernelActions` fetches the last 50 `kernel_action_runs` unfiltered — it shows everything (success, failed, running, queued). The card shows all statuses equally, making it noisy. Should prioritize failures and manual actions.

### 5. Impact Score Calculation
- `compute-impact` uses BFS traversal through `context_dependencies` with strength-based decay (`pathStrength * strength/100`). Logic is sound: visits connected blocks, accumulates weighted scores, avoids cycles via `visited` set. No issues found in the algorithm itself.

---

## Implementation Plan

### Task 1: Enable Realtime for Kernel Tables
Create a migration to add realtime for the core kernel tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.kernel_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kernel_entities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kernel_action_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_events;
```

### Task 2: Add Realtime Subscriptions to Hooks
Update key hooks to subscribe to Supabase channels and invalidate queries on changes:

- **`useKernelEvents`**: Subscribe to `kernel_events` inserts, invalidate query on new events
- **`useChangeEvents`**: Subscribe to `change_events` inserts for Live Feed
- **`useKernelActions`**: Subscribe to `kernel_action_runs` changes
- **`useKernelEntities`**: Subscribe to `kernel_entities` updates

Pattern per hook:
```typescript
useEffect(() => {
  if (!workspaceId) return;
  const channel = supabase
    .channel(`kernel-events-${workspaceId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'kernel_events',
      filter: `workspace_id=eq.${workspaceId}`,
    }, () => queryClient.invalidateQueries({ queryKey: ['kernel-events'] }))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [workspaceId]);
```

### Task 3: Add Event Throttling to Live Feed
In `KernelLiveFeedCard`, add a throttle mechanism:
- Track last render timestamp
- If new data arrives within 5 seconds of last update, debounce the state update
- Use a `useRef` + `setTimeout` pattern to batch renders (max 1 update per 5 seconds)
- This prevents UI flicker when many events arrive rapidly

### Task 4: Filter KernelActionsCard to Meaningful Actions
Update `useKernelActions` to filter `kernel_action_runs`:
- Default view: show only `failed` and `running` status runs
- Add a toggle/tab to see "all" if needed
- Prioritize: failed first, then running, then queued
- Exclude `success` from the default daily feed (show only as count in header)

### Task 5: Validate Impact Score Logic
The `compute-impact` BFS is correct. Two minor improvements:
- Add a **max depth cap** (e.g., depth 5) to prevent deep traversals in large graphs
- Add a **minimum score threshold** (e.g., discard impacts < 1) to reduce noise
- Both changes in `supabase/functions/compute-impact/index.ts`

---

## Files to Modify
1. **New migration** — enable realtime on 4 kernel tables
2. **`src/hooks/useKernelEvents.ts`** — add realtime subscription
3. **`src/hooks/useChangeEvents.ts`** — add realtime subscription
4. **`src/hooks/useKernelActions.ts`** — add realtime subscription + filter meaningful actions
5. **`src/hooks/useKernelEntities.ts`** — add realtime subscription
6. **`src/components/command-center/KernelLiveFeedCard.tsx`** — add throttle logic
7. **`src/components/command-center/KernelActionsCard.tsx`** — filter to failures/manual only by default
8. **`supabase/functions/compute-impact/index.ts`** — add depth cap + min score threshold

