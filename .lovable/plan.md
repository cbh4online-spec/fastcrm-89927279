

# AI Agents — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Job Dispatch | Works | `useAgentLifecycle.ts` already emits `AGENT.JOB_DISPATCHED`. No logging |
| Job Cancel | Works | Zero kernel events, no logging |
| Agent Analysis | Works | `useAgentAnalysis.ts` calls orchestrator. Zero kernel events, no logging |
| Smoke Tests | Partial | `ai_agent_jobs` and `ai_agent_registry` checked. Missing `ai_agent_executions`, `ai_agent_locks`, `ai_agent_memory` |
| Observability | **None** | No structured logging in either hook |

## Implementation Plan

### A) Kernel Events — Complete the Lifecycle

**`src/hooks/useAgentLifecycle.ts`** (already has `emitKernelEvent` imported):

1. **`dispatchMutation.onSuccess`** — Already emits `AGENT.JOB_DISPATCHED`. Add `[AI-AGENT]` logging.
2. **`dispatchMutation.onError`** — Add `console.warn('[AI-AGENT] DISPATCH_FAILED')`.
3. **`cancelMutation.onSuccess`** — Emit `AGENT.JOB_CANCELLED` with `job_id`. Add logging.
4. **`cancelMutation.onError`** — Add `console.warn('[AI-AGENT] CANCEL_FAILED')`.

**`src/hooks/useAgentAnalysis.ts`** (needs `emitKernelEvent` import):

1. **`analyzeMutation` before invoke** — Emit `AGENT.EXECUTION_STARTED` with `agent_type`, `entity_id`, `trigger_type`.
2. **`analyzeMutation.onSuccess` (success=true)** — Emit `AGENT.EXECUTION_COMPLETED` with `execution_id`, `duration_ms`, `tokens_used`.
3. **`analyzeMutation.onSuccess` (success=false/partial)** — Emit `AGENT.EXECUTION_FAILED` with `error`.
4. **`analyzeMutation.onError`** — Emit `AGENT.EXECUTION_FAILED` with error message.

All events: `source_module: 'ai-agents'`, `correlation_id` via `generateRequestId()`.

### B) Observability — Structured Logging

Both hooks: `[AI-AGENT]` prefixed `console.log` on success, `console.warn` on error for every mutation.

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `ai_agent_executions` table check
- `ai_agent_locks` table check
- `ai_agent_memory` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useAgentLifecycle.ts` | Add `[AI-AGENT]` logging to dispatch/cancel; emit `AGENT.JOB_CANCELLED` on cancel success |
| `src/hooks/useAgentAnalysis.ts` | Import `emitKernelEvent` + `generateRequestId`; emit `AGENT.EXECUTION_STARTED`/`COMPLETED`/`FAILED`; add `[AI-AGENT]` logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `ai_agent_executions`, `ai_agent_locks`, `ai_agent_memory` checks |

