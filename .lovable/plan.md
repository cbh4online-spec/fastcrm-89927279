

# AI Conversational Module — Kernel V2 Integration

## Current State

| Component | Edge Function | Hook | Kernel Event | Gaps |
|-----------|--------------|------|-------------|------|
| Classification | `classify-conversation` (tool calling, valid schema) | `useConversationClassification` | None | No kernel event on classify/save/confirm. No observability logging. Summary parses JSON via regex (fragile). |
| Summary | `conversation-summary` (free-text JSON parse) | `useConversationSummary` | None | No kernel event. JSON extracted via regex — can fail silently. No latency logging. |
| Intelligence | `conversation-intelligence` (tool calling, valid schema) | `useConversationIntelligence` | None | No kernel event. No feedback loop. No evidence stored. |
| Feedback | N/A | `useConfirmClassification` saves to conversations table | None | User correction doesn't emit kernel event. No "why classified" evidence stored. |
| Smoke Test | None for AI conversational | — | — | No smoke test validates AI response schema |
| Simulator UI | None | — | — | No way to test rules/goals with sample input |

**Classification and Intelligence already use tool calling** → schema is enforced by the AI gateway. Summary uses free-text JSON parsing which is fragile.

## Implementation Plan

### A) Blockers — Schema Safety & Observability

**1. `conversation-summary` edge function** — Switch from free-text JSON parsing to tool calling (like classify and intelligence already do). This guarantees valid schema output. Add latency + error logging via `console.log` with `[CONV-SUMMARY]` prefix and timing.

**2. All 3 edge functions** — Add timing instrumentation: record `startTime`, compute `latency_ms`, log `[MODULE_ID] latency_ms=X status=ok|error` for each call. Add `usage` field from AI gateway response to logs when available.

**3. Simulator UI** — Add a "Simulador" tab to `ConversationalEngineModule.tsx` with a textarea for sample messages, buttons to run classify/summary/intelligence, and display results inline. Uses the existing edge functions directly.

### B) V2 Improvements — Feedback Loop & Evidence

**1. `useSaveClassification`** — When `isAI=false` (user override), emit `CONVERSATION.FEEDBACK` kernel event with `{ original_classification, user_classification, conversation_id }`. This creates a record of corrections.

**2. `useConfirmClassification`** — On success, emit `CONVERSATION.CLASSIFIED` kernel event with the confirmed classification (priority, intent, sentiment, reasoning).

**3. Evidence storage** — When classification is saved (AI or user), store `reasoning` field from the AI response into the conversation record. The `reasoning` field already comes from the classify edge function but isn't persisted — add it to `useSaveClassification` update payload as `ai_classification_reasoning`.

### C) Kernel Events

| Event | Location | Payload |
|-------|----------|---------|
| `CONVERSATION.CLASSIFIED` | `useConfirmClassification.onSuccess` | priority, intent, sentiment, reasoning, is_ai_confirmed |
| `CONVERSATION.SUMMARIZED` | `useConversationSummary.generateSummary` (after success) | conversation_id, bullet_count, status |
| `CONVERSATION.INTENT_DETECTED` | `ConversationIntelligencePanel.handleAnalyze` (after success) | buying_intent_level, urgency_level, drop_off_risk, tags |

All events include `correlation_id` via `generateRequestId()` and `actor_id` from auth context.

### D) Smoke Test

Add to `system-run-smoke-tests`:
- `ai-conversational`: invoke `classify-conversation` with a sample message `[{direction:"inbound", content:"Quanto custa o plano premium?"}]` → assert response has `priority`, `intent`, `sentiment` fields.

### E) Observability

- Edge functions: Add `performance.now()` timing and log `latency_ms` + `status` + `error_message` (if any).
- UI hooks: Generate `correlation_id` and log it to console for traceability.

## File Plan

| File | Action |
|------|--------|
| `supabase/functions/conversation-summary/index.ts` | Switch to tool calling for guaranteed schema |
| `supabase/functions/classify-conversation/index.ts` | Add timing instrumentation |
| `supabase/functions/conversation-intelligence/index.ts` | Add timing instrumentation |
| `src/hooks/useConversationClassification.ts` | Add kernel events to `useSaveClassification` + `useConfirmClassification` |
| `src/hooks/useConversationSummary.ts` | Emit `CONVERSATION.SUMMARIZED` after successful summary |
| `src/components/inbox/ConversationIntelligencePanel.tsx` | Emit `CONVERSATION.INTENT_DETECTED` after analysis |
| `src/components/conversational-engine/ConversationalEngineModule.tsx` | Add Simulador tab |
| `src/components/conversational-engine/SimulatorTab.tsx` | New — sample input → classify/summary/intelligence output display |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `ai-conversational` smoke test |

