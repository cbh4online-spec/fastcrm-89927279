

# AI-Suggestions — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Field Suggestions CRUD | `useFieldSuggestions.ts` | `CUSTOM_FIELD.AI_SUGGESTIONS_GENERATED`, `AI_SUGGESTION_ACCEPTED`, `AI_SUGGESTION_REJECTED` | `[CUSTOM-FIELDS]` prefix ✓ |
| Automation Suggestions CRUD | `useAutomationSuggestions.ts` | None | `console.error` only (generate) |
| Suggestions History | `useAISuggestionsHistory.ts` | None | None |
| Context AI Assist | `useContextAI.ts` | None | Toast only |
| Edge: ai-field-suggestions | `ai-field-suggestions/index.ts` | None | Bare `console.error` |
| Edge: ai-automation-suggestions | `ai-automation-suggestions/index.ts` | None | Bare `console.log/error` |
| Smoke Tests | `system-run-smoke-tests` | — | No `ai_field_suggestions` or `automation_suggestions` checks |

`useFieldSuggestions.ts` already has kernel events but uses `[CUSTOM-FIELDS]` prefix — needs alignment to `[AI-SUGGESTIONS]`. `useAutomationSuggestions.ts` has zero kernel events. Both edge functions lack standardized logging. No smoke test coverage.

## Implementation Plan

### A) Kernel Events (source: `ai-suggestions`)

**`useAutomationSuggestions.ts`:**
1. `useGenerateAutomationSuggestions.onSuccess` → `SUGGESTION.GENERATED` (entity_kind: `automation_suggestion`, payload: `count`)
2. `useAcceptAutomationSuggestion.onSuccess` → `SUGGESTION.ACCEPTED` (entity_kind: `automation_suggestion`)
3. `useDismissAutomationSuggestion.onSuccess` → `SUGGESTION.DISMISSED` (entity_kind: `automation_suggestion`)
4. `useDismissAllSuggestions.onSuccess` → `SUGGESTION.ALL_DISMISSED` (entity_kind: `automation_suggestion`)

**`useFieldSuggestions.ts`:**
5. Align existing events: `CUSTOM_FIELD.AI_SUGGESTIONS_GENERATED` → `SUGGESTION.CREATED`, `CUSTOM_FIELD.AI_SUGGESTION_ACCEPTED` → `SUGGESTION.ACCEPTED`, `CUSTOM_FIELD.AI_SUGGESTION_REJECTED` → `SUGGESTION.REJECTED`
6. Update `source_module` from `core-custom-fields` → `ai-suggestions`

### B) Logging (prefix: `[AI-SUGGESTIONS]`)

**`useFieldSuggestions.ts`:** Align `[CUSTOM-FIELDS]` → `[AI-SUGGESTIONS]`

**`useAutomationSuggestions.ts`:** Add `[AI-SUGGESTIONS]` prefix on generate success/error, accept, dismiss

**`useAISuggestionsHistory.ts`:** Add fetch error logging

**`useContextAI.ts`:** Add `[AI-SUGGESTIONS]` logging on suggest/generate success/error

**Edge: `ai-field-suggestions`:** Align to `[AI-SUGGESTIONS]` prefix

**Edge: `ai-automation-suggestions`:** Align to `[AI-SUGGESTIONS]` prefix

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `ai_field_suggestions` (module: `ai-suggestions`)
- `automation_suggestions` (module: `ai-suggestions`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useFieldSuggestions.ts` | Rename events to `SUGGESTION.CREATED/ACCEPTED/REJECTED`; change `source_module` to `ai-suggestions`; align logging prefix to `[AI-SUGGESTIONS]` |
| `src/hooks/useAutomationSuggestions.ts` | Import `emitKernelEvent`; emit `SUGGESTION.GENERATED`, `SUGGESTION.ACCEPTED`, `SUGGESTION.DISMISSED`, `SUGGESTION.ALL_DISMISSED`; add `[AI-SUGGESTIONS]` logging |
| `src/hooks/useAISuggestionsHistory.ts` | Add `[AI-SUGGESTIONS]` fetch error logging |
| `src/hooks/useContextAI.ts` | Add `[AI-SUGGESTIONS]` logging on suggest/generate actions |
| `supabase/functions/ai-field-suggestions/index.ts` | Align to `[AI-SUGGESTIONS]` prefix |
| `supabase/functions/ai-automation-suggestions/index.ts` | Align to `[AI-SUGGESTIONS]` prefix |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `ai_field_suggestions` + `automation_suggestions` checks |

