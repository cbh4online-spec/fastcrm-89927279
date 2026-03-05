

# AI Assistants — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Kernel Events | **None** | Zero `ASSISTANT.*` kernel events in codebase |
| Agent CRUD | Works | `useAIChannelAgents` handles create/update/delete. No kernel events emitted |
| Persona CRUD | Works | `useKnowledgeBase` manages personas. No kernel events |
| Knowledge Base | Works | Full CRUD + document processing. No kernel events |
| Test AI | Works | `TestAITab` queries AI via `queryKnowledge`. No token/failure logging |
| Smoke Tests | Partial | `ai_agents` table checked but no persona/KB checks |

## Implementation Plan

### A) Kernel Events — Wire `ASSISTANT.UPDATED`

**1. `useAIChannelAgents.updateAgent`** — After successful update, emit `ASSISTANT.UPDATED` with `agent_id`, `channel`, `changed_fields` (keys of the update payload). Also emit on `createAgent` → `ASSISTANT.CREATED` and `toggleAgentStatus` → `ASSISTANT.TOGGLED` with `is_active` state.

**2. `useKnowledgeBase` persona updates** — When a persona is updated (need to check if `updatePersona` exists), emit `ASSISTANT.PERSONA_UPDATED` with `persona_id`, `name`.

All events use `emitKernelEvent` with `source_module: 'ai-assistants'`.

### B) Observability — Token Usage & Failure Logging

In `useKnowledgeBase.queryKnowledge` (the test AI path), add structured logging:
- `console.log('[AI-ASSISTANT] QUERY latency_ms=X tokens=Y persona=Z')` on success
- `console.warn('[AI-ASSISTANT] QUERY_FAILED error=X')` on failure

### C) Smoke Test Enhancement

Add to `system-run-smoke-tests`:
- `ai-personas`: query `ai_personas` table count
- `ai-knowledge-bases`: query `knowledge_bases` table count

### D) Prompt Versioning Note

The current architecture stores prompts as `system_prompt` on `ai_personas`. True prompt versioning (history + rollback) would require a new `ai_persona_versions` table — this is a V2 concern and not wired in this stabilization pass.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useAIChannelAgents.ts` | Import `emitKernelEvent`; emit `ASSISTANT.CREATED` in `createAgent.onSuccess`, `ASSISTANT.UPDATED` in `updateAgent.onSuccess`, `ASSISTANT.TOGGLED` in `toggleAgentStatus` |
| `src/hooks/useKnowledgeBase.ts` | Add structured logging to `queryKnowledge`; emit `ASSISTANT.PERSONA_UPDATED` if persona update exists |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `ai-personas` and `ai-knowledge-bases` table count checks |

