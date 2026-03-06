

# AI-Personas — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Persona CRUD (Profiles page) | `useAIProfiles.ts` | None | `console.error` only |
| Persona CRUD (KB context) | `useKnowledgeBase.ts` | `ASSISTANT.PERSONA_UPDATED` only | Mixed (`console.error` + structured for queries) |
| Persona fetch (KB context) | `useKnowledgeBase.ts` | None | `console.error` only |
| Channel Agents (persona selection) | `useAIChannelAgents.ts` | `ASSISTANT.CREATED` exists | `console.error` only |
| Edge: chat-widget | `chat-widget/index.ts` | None | Existing |
| Edge: ai-inbox-reply | `ai-inbox-reply/index.ts` | None | Existing |
| Edge: ai-employee-executor | `ai-employee-executor/index.ts` | None | Existing |
| Smoke Tests | `system-run-smoke-tests` | — | Already has `ai_personas` check |

Two separate hooks manage personas. `useAIProfiles.ts` has zero kernel events. `useKnowledgeBase.ts` has one event (`PERSONA_UPDATED`) but missing `CREATED`/`DELETED`/`ACTIVATED`. Edge functions that consume personas have no selection logging.

## Implementation Plan

### A) Kernel Events (source: `ai-personas`)

**`useAIProfiles.ts`:**
1. `createProfile` success → emit `PERSONA.CREATED` (entity_kind: `ai_persona`, payload: `name`, `persona_type`, `is_active`)
2. `updateProfile` success → emit `PERSONA.UPDATED` (entity_kind: `ai_persona`, payload: `name`, `changed_fields`)
3. `deleteProfile` success → emit `PERSONA.DELETED` (entity_kind: `ai_persona`)
4. `toggleActive` success → emit `PERSONA.ACTIVATED` or `PERSONA.DEACTIVATED` (payload: `is_active`)

**`useKnowledgeBase.ts`:**
5. `createPersona` success → emit `PERSONA.CREATED` (already has `PERSONA_UPDATED`, align naming)
6. `deletePersona` success → emit `PERSONA.DELETED`

### B) Logging (prefix: `[AI-PERSONAS]`)

**`useAIProfiles.ts`:**
- Fetch error → `console.warn('[AI-PERSONAS] PROFILES_FETCH_FAILED')`
- Create success → `console.log('[AI-PERSONAS] PERSONA_CREATED id=...')`
- Create error → `console.error('[AI-PERSONAS] PERSONA_CREATE_FAILED')`
- Update success → `console.log('[AI-PERSONAS] PERSONA_UPDATED id=...')`
- Update error → `console.error('[AI-PERSONAS] PERSONA_UPDATE_FAILED')`
- Delete success → `console.log('[AI-PERSONAS] PERSONA_DELETED id=...')`
- Delete error → `console.error('[AI-PERSONAS] PERSONA_DELETE_FAILED')`

**`useKnowledgeBase.ts`:**
- Align persona CRUD logs to `[AI-PERSONAS]` prefix (create/update/delete)

**Edge functions** (`chat-widget`, `ai-inbox-reply`, `ai-employee-executor`):
- Add persona selection log: `console.log('[AI-PERSONAS] PERSONA_SELECTED id=... channel=...')`

### C) Smoke Tests

Already has `ai_personas` check in `system-run-smoke-tests`. No additions needed.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useAIProfiles.ts` | Import `emitKernelEvent`; emit `PERSONA.CREATED`, `PERSONA.UPDATED`, `PERSONA.DELETED`, `PERSONA.ACTIVATED`/`DEACTIVATED`; add `[AI-PERSONAS]` logging |
| `src/hooks/useKnowledgeBase.ts` | Emit `PERSONA.CREATED` + `PERSONA.DELETED`; align existing event to `PERSONA.UPDATED`; add `[AI-PERSONAS]` prefix |
| `supabase/functions/chat-widget/index.ts` | Add `[AI-PERSONAS] PERSONA_SELECTED` log when persona is loaded |
| `supabase/functions/ai-inbox-reply/index.ts` | Add `[AI-PERSONAS] PERSONA_SELECTED` log when persona is loaded |
| `supabase/functions/ai-employee-executor/index.ts` | Add `[AI-PERSONAS] PERSONA_SELECTED` log when persona is loaded |

