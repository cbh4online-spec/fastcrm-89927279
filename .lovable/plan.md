

# Kernel V2 — Implementation Plan

## Current State Analysis

**Already exists (V1):**
- Tables: `kernel_events`, `kernel_entities`, `kernel_links`, `kernel_actions_registry`, `kernel_action_runs`, `kernel_decisions`, `kernel_decision_evidence`, `context_bindings`, `change_events`, `impact_map`, `drift_scores`, `system_function_runs`, `system_smoke_test_runs`, `system_smoke_test_failures`, `feature_registry_runtime`
- Edge functions: `kernel-ingest-event`, `kernel-process-events`, `kernel-compute-decisions`, `kernel-run-actions`, `kernel-compute-impact`, `kernel-compute-drift`, `system-log-function-run`, `system-run-smoke-tests`, `system-module-health`
- UI: Command Center (decisions, actions, drift, events timeline), Impact Map (context + kernel views), System Health page
- Emitters: `emitKernelEvent` wired into opportunities (UPDATED, STAGE_CHANGED, CLOSED)

**Missing for V2:**

| Gap | Detail |
|-----|--------|
| `kernel_event_state` table | Not created (migration existed in process-events code but table never migrated) |
| `kernel_event_deadletter` table | Not created |
| `kernel_outcomes` table | New — decision/action attribution tracking |
| `kernel_policies` table | New — workspace governance rules |
| `kernel_events` schema gaps | Missing `occurred_at`, `ingested_at`, `schema_version` columns |
| `kernel_action_runs` gaps | Missing `correlation_id` column |
| `kernel_decision_evidence` gaps | Missing `ref_kind` column |
| V2 action types | Missing `SEND_EMAIL`, `SEND_INBOX_REPLY`, `UPDATE_ASSET`, `PAUSE_CAMPAIGN`, `PUBLISH_ASSET` in registry |
| V2 decision statuses | Missing `executed`, `archived` handling |
| Policy-based governance | `kernel-run-actions` doesn't check `kernel_policies` for auto/approve/suggest |
| `FUNNEL_LEAK` decision rule | Not implemented |
| Event emitters | Only opportunities wired. Missing: inbox, conversational, context-os, store |
| Correlation ID propagation | `system_function_runs` has `request_id` but kernel functions don't log to it |
| Approval queue UI | Not in Command Center |
| Context OS integration | No "Run Impact" button or bindings view |
| System Health deadletter view | Not showing deadletter count |

## Implementation Plan

### Phase A — Database Migration

Single migration adding:

1. **`kernel_event_state`** — consumer watermarks (consumer_key pk, workspace_id, last_ingested_at, last_event_id, updated_at)
2. **`kernel_event_deadletter`** — failed events (id, workspace_id, consumer_key, event_id FK, error_message, error_stack, retry_count, last_attempt_at, created_at)
3. **`kernel_outcomes`** — attribution (id, workspace_id, decision_id FK, action_run_id FK, outcome_type, outcome_value jsonb, occurred_at)
4. **`kernel_policies`** — governance (id, workspace_id, decision_type, default_mode, approver_role, risk_thresholds jsonb, updated_at)
5. **ALTER `kernel_events`** — add `occurred_at`, `ingested_at`, `schema_version` columns (nullable, backwards-compatible)
6. **ALTER `kernel_action_runs`** — add `correlation_id` column
7. **ALTER `kernel_decision_evidence`** — add `ref_kind` column
8. **Seed** additional action registry entries (SEND_EMAIL, SEND_INBOX_REPLY, UPDATE_ASSET, PAUSE_CAMPAIGN, PUBLISH_ASSET)
9. RLS on all new tables scoped to workspace members

### Phase B — Edge Function Updates

**`kernel-ingest-event`**: Add `occurred_at`, `schema_version`, `correlation_id` support. Log to `system_function_runs` via internal call.

**`kernel-process-events`**: Use `kernel_event_state` table for persistent watermarks. Write failures to `kernel_event_deadletter`. Propagate `correlation_id`.

**`kernel-compute-decisions`**: Add `FUNNEL_LEAK` rule (check conversion metrics). Respect `kernel_policies` for `default_mode` when setting decision status. Store `ref_kind` in evidence.

**`kernel-run-actions`**: Check `kernel_policies` for auto/approve/suggest governance before execution. Add `SEND_INBOX_REPLY` and `UPDATE_ASSET` action handlers. Write `correlation_id` to action runs. Record `kernel_outcomes` on success.

**`kernel-compute-impact`**: No major changes needed — already does BFS traversal through links + bindings.

**`kernel-compute-drift`**: Reference `kernel_event_deadletter` count as an additional drift signal.

### Phase C — Event Emitters (Wiring)

Wire `emitKernelEvent` with `idempotency_key` and `correlation_id` into:

- **Inbox** (`useConversations` or similar): `CONVERSATION.RECEIVED`, `MESSAGE.RECEIVED`
- **AI Conversational** (post-classification hook): `CONVERSATION.CLASSIFIED`, `CONVERSATION.SUMMARIZED`
- **Context OS** (`useContextBlocks` save): `CONTEXT.BLOCK_UPDATED`
- **Store** (cart abandonment if available): `CART.ABANDONED`

Each emitter generates a `requestId` from `src/lib/requestId.ts` and passes it through.

### Phase D — UI Integration

**Command Center** — Add "Approval Queue" tab showing decisions with `status=open` and `policy.mode=approve`, with approve/reject buttons.

**Context OS** — Add "Run Impact" button that invokes `kernel-compute-impact` for the workspace. Add compact bindings view showing context_block → asset mappings.

**Impact Map** — Enhance kernel view: clicking a node shows linked decisions/actions in a sidebar panel.

**System Health** — Add deadletter count card and kernel consumer status (from `kernel_event_state`).

### File Plan

| File | Action |
|------|--------|
| Migration SQL | 4 new tables + 3 ALTER + seed actions |
| `supabase/functions/kernel-ingest-event/index.ts` | Add V2 fields + observability logging |
| `supabase/functions/kernel-process-events/index.ts` | Persistent watermarks + deadletter |
| `supabase/functions/kernel-compute-decisions/index.ts` | FUNNEL_LEAK rule + policy awareness + ref_kind |
| `supabase/functions/kernel-run-actions/index.ts` | Policy governance + new actions + outcomes |
| `supabase/functions/kernel-compute-drift/index.ts` | Deadletter signal |
| `src/lib/kernelEmitter.ts` | Add correlation_id, occurred_at, schema_version |
| `src/hooks/useConversations.ts` (or equivalent) | Wire CONVERSATION events |
| `src/components/context-os/WizardShell.tsx` (or block save) | Wire CONTEXT.BLOCK_UPDATED |
| `src/hooks/useKernelDecisions.ts` | Add approval queue filter |
| `src/pages/CommandCenterPage.tsx` | Add Approval Queue tab |
| `src/pages/SystemHealthPage.tsx` | Add deadletter + consumer status |
| `src/pages/ImpactMapPage.tsx` | Enhance kernel node sidebar |
| `src/components/context-os/ContextOSDashboard.tsx` | Add Run Impact button + bindings |

