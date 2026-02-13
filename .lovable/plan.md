
# Bloco 3 – Auditoria da Integracao IA

## Estado: ✅ IMPLEMENTADO

Todas as 4 correções foram aplicadas:

| # | Correção | Estado |
|---|----------|--------|
| 1 | Injetar memória do agente no AI draft | ✅ Done |
| 2 | Autopilot grava ai_agent_executions | ✅ Done |
| 3 | Classificar intenção antes de responder | ✅ Done |
| 4 | memory_context e detected_intent no audit | ✅ Done |

### Alterações realizadas:

**Migração SQL:** Adicionadas colunas `memory_context` (JSONB) e `detected_intent` (JSONB) à tabela `ai_message_audit`.

**ai-inbox-reply:**
- Chama `retrieve_entity_memories` RPC para buscar até 5 memórias do lead/conversa
- Injeta memórias como secção "Agent Memory" no user content
- Aceita `detectedIntent` do autopilot e injeta no prompt
- Grava `memory_context` e `detected_intent` no `ai_message_audit`

**ghl-webhook-message:**
- Classificação de intenção via `google/gemini-2.5-flash-lite` antes de gerar resposta
- Passa `detectedIntent` ao `ai-inbox-reply`
- Grava execução unificada em `ai_agent_executions` após envio

**Frontend:**
- `useAIMessageAudit.ts` — tipo atualizado com `memory_context` e `detected_intent`
