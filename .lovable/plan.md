

# Plan: Add Conversation Context Tracking

## Problem
The AI chat sends raw `conversation_history` (message strings) but lacks structured context about what data was queried and analyzed. Follow-up questions like "quais desses?" or "explica melhor" fail because the AI doesn't know what dataset or analysis was last returned.

## Solution
Add a `conversation_context` object that accumulates structured state across the chat session:

```text
conversation_context = {
  last_question: "quais deals estão em risco?",
  last_dataset: { intent: "pipeline_risk", object_type: "deals", items: [...], metric: {...} },
  last_analysis: "3 deals em risco totalizando €45k..."
}
```

### Changes

**1. `src/components/command-center/AIQuestionBox.tsx`**
- Add `conversationContext` state ref tracking `{ last_question, last_dataset, last_analysis }`
- After each AI response (`result`), update context with the question, returned items/metric, and headline+subtext
- Pass `conversationContext` to `ask()` alongside `conversationHistory`
- Reset context in `handleNewConversation`

**2. `src/hooks/useAskFastCRM.ts`**
- Extend `ask()` signature to accept optional `conversationContext` parameter
- Include it in the edge function body payload

**3. `supabase/functions/ask-fastcrm/index.ts`**
- Extract `conversation_context` from request body
- Inject it into the LLM system prompt as structured context:
  ```
  ## Contexto da conversa anterior:
  Última pergunta: {last_question}
  Dados retornados: {last_dataset summary}
  Última análise: {last_analysis}
  ```
- Use it in both the deterministic follow-up detection (if `last_dataset` exists and question is a pronoun/follow-up like "desses", "quais", "explica") and in the LLM prompt for richer context

This ensures follow-up questions reference the actual data that was returned, not just the text of previous messages.

