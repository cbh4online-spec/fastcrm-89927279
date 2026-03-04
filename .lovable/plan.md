

# FastCRM Kernel v1 — Implementation Plan

## Existing Infrastructure Mapping

The system already has significant infrastructure that overlaps with the Kernel PRD. The Kernel must **unify and extend** rather than duplicate:

| PRD Table | Existing Equivalent | Action |
|---|---|---|
| `kernel_events` | `context_event_log` | **Create new** — broader scope (all modules, not just Context OS) |
| `kernel_entities` | None | **Create new** |
| `kernel_links` | `context_dependencies` | **Create new** — cross-module, not just context blocks |
| `kernel_actions_registry` | `actionRegistry.ts` (in-memory) | **Create new** — DB-backed with executor config |
| `kernel_action_runs` | None | **Create new** |
| `kernel_decisions` | `strategic_decisions` | **Create new** — unified decision model with evidence + policy |
| `kernel_decision_evidence` | None | **Create new** |
| `context_blocks` | Already exists | **Skip** |
| `context_bindings` | None | **Create new** — links context blocks to CRM assets |
| `change_events` | None | **Create new** |
| `impact_map` | None | **Create new** — persisted impact results |
| `drift_scores` | `context_drift` | **Create new** — broader scope (asset/module/workspace) |

## Phase 1 — Database Migration

**New tables (10):**
1. `kernel_events` — append-only event log with `source_module`, `source_route`, idempotency via unique `(workspace_id, type, entity_kind, entity_id, created_at)` or dedup key
2. `kernel_entities` — normalized entity registry (kind + entity_id + title + meta)
3. `kernel_links` — cross-module dependency graph (from_kind/id → to_kind/id + relation_type + confidence)
4. `kernel_actions_registry` — action catalog with `executor` (edge function name), `input_schema`, `requires_approval`
5. `kernel_action_runs` — execution log (status, input, output, error, related_event_id, related_decision_id)
6. `kernel_decisions` — unified decision model with `priority`, `rationale`, `recommended_actions`, `policy`, `status`
7. `kernel_decision_evidence` — evidence references (event/query/asset + snippet)
8. `context_bindings` — links context blocks to CRM assets (block_id → asset_kind/asset_id)
9. `change_events` — business change tracking (entity_kind/id + old_value/new_value)
10. `impact_map` — persisted impact results (change_event_id → affected_kind/id + status + suggested_action)
11. `drift_scores` — broader drift (scope_type: asset/module/workspace + score + reasons)

All tables get RLS scoped by workspace membership. `kernel_actions_registry` is readable by all authenticated users, writable by admins only.

Seed `kernel_actions_registry` with initial actions: `CREATE_TASK`, `NOTIFY`, `SEND_EMAIL`, `UPDATE_ASSET`, `RUN_AI_AGENT_JOB`.

## Phase 2 — Edge Functions

### A) `kernel-ingest-event`
- Input: `{ workspace_id, type, entity_kind, entity_id, actor_type, actor_id, payload, source_module, source_route, idempotency_key? }`
- Insert into `kernel_events` (skip if idempotency_key duplicate)
- Upsert `kernel_entities` (kind + entity_id → title from payload)

### B) `kernel-process-events`
- Reads unprocessed `kernel_events` using a watermark approach (last processed timestamp stored in a simple state row or param)
- Groups events and dispatches to decision computation + drift/impact when relevant
- Calls `kernel-compute-decisions` and `kernel-compute-impact` internally

### C) `kernel-compute-decisions`
- Analyzes signals from `kernel_events`, `kernel_entities`, `kernel_links`
- V1 rules:
  - Opportunity stale (no activity >5 days) → decision
  - Deal score drop (integrate with `deal_scores`) → decision
  - Conversation classified as "hot lead" or "risk" (from `conversation_signals`) → decision
- Creates `kernel_decisions` + `kernel_decision_evidence` rows
- Dedup by type+entity within 7 days

### D) `kernel-run-actions`
- Reads `kernel_decisions` with status `accepted` (or auto-execute if policy allows)
- Executes each recommended action:
  - `CREATE_TASK` → insert into `tasks`
  - `NOTIFY` → insert into `context_alerts`
  - `RUN_AI_AGENT_JOB` → insert into `ai_agent_jobs`
- Logs each execution in `kernel_action_runs`

### E) `kernel-compute-impact`
- Triggered when `change_events` are created
- Traverses `kernel_links` + `context_bindings` to find affected assets
- Creates `impact_map` rows + updates `drift_scores`

### F) `kernel-compute-drift`
- Computes drift at asset/module/workspace level
- Sources: stale `impact_map` items, context changes without asset updates, unresolved conversion drops
- Upserts `drift_scores`, optionally creates alerts

## Phase 3 — Frontend

### Hooks
1. `useKernelEvents` — query kernel_events with filters
2. `useKernelEntities` — query/search kernel_entities
3. `useKernelLinks` — CRUD kernel_links
4. `useKernelDecisions` — query/accept/reject decisions
5. `useKernelActions` — query registry + action runs
6. `useChangeEvents` — query change_events
7. `useDriftScores` — query drift_scores
8. `useContextBindings` — CRUD context_bindings

### UI Updates

**Command Center (`/dashboard/command-center`):**
- Add "Kernel Decisions" tab showing `kernel_decisions` (open) with accept/reject/execute actions
- Add drift score overview (workspace-level)
- Add "Today's Actions" section from recent `kernel_action_runs`

**Context OS (`/dashboard/context-os`):**
- Add "Bindings" section to block detail showing which CRM assets depend on each block
- CRUD for `context_bindings`

**Impact Map (`/dashboard/impact-map`):**
- Extend to show `kernel_entities` + `kernel_links` (not just context blocks)
- Show `change_events` → `impact_map` highlights
- Color nodes: red=stale, green=updated, yellow=needs_review

**Command Palette (⌘K):**
- Add commands: `/decisions`, `/impact`, `/kernel-status`
- Wire to `kernel-compute-decisions` and `kernel-run-actions`

## Phase 4 — Event Emitters (Minimal Wiring)

Add `kernel-ingest-event` calls from:
1. **Opportunities** — stage changes (in existing opportunity hooks/pages)
2. **Inbox** — new messages + classification results
3. **Store** — abandoned cart detection (in `detect-abandoned-carts`)
4. **Strategic Brief** — store weekly brief as `kernel_decisions` type `STRATEGIC_WEEKLY`

These are lightweight: a single `supabase.functions.invoke('kernel-ingest-event', { body: {...} })` call at key mutation points.

## File Plan

| File | Action |
|---|---|
| Migration SQL | 11 new tables + seed actions registry |
| `supabase/functions/kernel-ingest-event/index.ts` | New edge function |
| `supabase/functions/kernel-process-events/index.ts` | New edge function |
| `supabase/functions/kernel-compute-decisions/index.ts` | New edge function |
| `supabase/functions/kernel-run-actions/index.ts` | New edge function |
| `supabase/functions/kernel-compute-impact/index.ts` | New edge function |
| `supabase/functions/kernel-compute-drift/index.ts` | New edge function |
| `src/hooks/useKernelDecisions.ts` | New hook |
| `src/hooks/useKernelActions.ts` | New hook |
| `src/hooks/useKernelEntities.ts` | New hook |
| `src/hooks/useContextBindings.ts` | New hook |
| `src/hooks/useDriftScores.ts` | New hook |
| `src/hooks/useChangeEvents.ts` | New hook |
| `src/components/kernel/KernelDecisionsPanel.tsx` | Decisions UI |
| `src/components/kernel/KernelActionsLog.tsx` | Action runs log |
| `src/components/kernel/ContextBindingsTab.tsx` | Bindings CRUD |
| `src/components/kernel/DriftOverview.tsx` | Workspace drift |
| `src/pages/CommandCenterPage.tsx` | Add kernel tabs |
| `src/pages/ImpactMapPage.tsx` | Extend with kernel entities |
| `src/lib/actionRegistry.ts` | Add kernel commands |
| `src/lib/kernelEmitter.ts` | Helper to emit kernel events |
| Existing hooks (opportunities, inbox) | Add kernel event emission |

## Implementation Order

1. Database migration (all 11 tables + seed)
2. Edge functions (ingest → process → decisions → actions → impact → drift)
3. Frontend hooks
4. UI components + page updates
5. Event emitters in existing modules
6. Cron setup for `kernel-process-events`

