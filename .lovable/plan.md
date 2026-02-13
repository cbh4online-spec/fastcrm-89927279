
# Bloco 3 – Auditoria da Integracao IA

## Resultado da Auditoria

Analisei os 5 pontos criticos contra o codigo existente:

| # | Ponto | Estado | Detalhe |
|---|-------|--------|---------|
| 1 | AI draft usa contexto completo | PARCIAL | `ai-inbox-reply` recebe mensagens, lead, opportunity e channel — mas NAO recebe memoria do agente (ai_agent_memory) |
| 2 | Memoria ligada a thread | FALHA | A tabela `ai_agent_memory` existe e tem funcoes RPC robustas (`retrieve_entity_memories`, `store_entity_memory`), mas o autopilot e o `ai-inbox-reply` NUNCA as usam. A memoria so e usada pelos agentes de analise (opportunity, client, orchestrator) |
| 3 | Guarda ai_agent_execution | PARCIAL | O `AISuggestModal` (frontend) grava em `ai_agent_executions` quando o utilizador clica "Usar". Mas o autopilot (resposta automatica) NAO grava nenhuma execucao — so grava em `autopilot_events` e `ai_response_audits` |
| 4 | Classifica intencao | FALHA | O `ai-copilot` tem funcao `classify_intent` pronta. O `ai-inbox-reply` extrai intent parcialmente (do tool call). Mas o autopilot NAO classifica intencao antes de responder — nao sabe se e venda, suporte ou pergunta |
| 5 | Cria logs | PARCIAL | `ai-inbox-reply` grava em `ai_message_audit` e `conversation_ai_state`. O autopilot grava em `autopilot_events` e `ai_response_audits`. Mas falta o registo unificado em `ai_agent_executions` para o autopilot |

---

## Correcoes Necessarias

### Correcao 1: Injetar memoria do agente no contexto do AI draft

O `ai-inbox-reply` ja recebe mensagens, lead data e knowledge base. Falta injetar memorias relevantes da tabela `ai_agent_memory` para que o AI tenha contexto historico sobre o contacto.

**Ficheiro:** `supabase/functions/ai-inbox-reply/index.ts`

**O que muda:**
- Antes de gerar a resposta, chamar `retrieve_entity_memories` (RPC existente) para buscar memorias do lead/conversation
- Adicionar uma seccao "Agent Memory" ao system prompt com as memorias recuperadas
- Limitado a 5 memorias mais relevantes para nao sobrecarregar o prompt

### Correcao 2: Autopilot grava ai_agent_executions

O autopilot (funcao `triggerAutopilotResponse` em `ghl-webhook-message`) grava em `autopilot_events` e `ai_response_audits` mas nao em `ai_agent_executions`. Isto impede visibilidade unificada nos paineis de agentes.

**Ficheiro:** `supabase/functions/ghl-webhook-message/index.ts`

**O que muda:**
- Apos gerar e enviar a resposta (passo 12), inserir registo em `ai_agent_executions` com:
  - `agent_type: "autopilot"`
  - `entity_type: "conversation"`
  - `entity_id: conversationId`
  - `trigger_type: "auto"`
  - `output: { response_preview, persona_id, channel, flow_used }`

### Correcao 3: Classificar intencao antes de responder

O autopilot responde sem saber se a mensagem e de vendas, suporte ou pergunta generica. Classificar a intencao permite escolher melhor o tom e priorizar.

**Ficheiro:** `supabase/functions/ghl-webhook-message/index.ts`

**O que muda:**
- Antes de chamar `ai-inbox-reply` (passo 10), fazer uma chamada leve ao AI gateway com um prompt de classificacao rapida (sem tool call completo, apenas um prompt simples que devolve intent + confidence)
- Passar o resultado como campo `detectedIntent` no body do `ai-inbox-reply`
- No `ai-inbox-reply`, adicionar o `detectedIntent` ao audit log e ao system prompt para contexto
- Usar modelo `google/gemini-2.5-flash-lite` para classificacao (rapido e barato)
- Gravar a intencao no `ai_message_audit`

### Correcao 4: Logs unificados — ai_message_audit para todas as chamadas

O `ai-inbox-reply` ja grava audit quando tem `workspaceId` e `conversationId`. Mas o autopilot chama `ai-inbox-reply` como server-to-server e os campos sao passados. Isto ja funciona. O que falta e garantir que o `detectedIntent` (correcao 3) e a `memoryContext` (correcao 1) tambem ficam no audit.

**Ficheiro:** `supabase/functions/ai-inbox-reply/index.ts`

**O que muda:**
- Adicionar campo `memory_context` ao insert do `ai_message_audit` (array de memorias usadas)
- Adicionar campo `detected_intent` ao insert do `ai_message_audit`

---

## Plano Tecnico

| Ficheiro | Tipo | Alteracao |
|---|---|---|
| `supabase/functions/ai-inbox-reply/index.ts` | Editar | Injetar memoria + intent no prompt e audit |
| `supabase/functions/ghl-webhook-message/index.ts` | Editar | Classificar intent + gravar ai_agent_executions |
| Migracao SQL | DB | Adicionar colunas `memory_context` e `detected_intent` ao `ai_message_audit` |

### Detalhe: Injecao de memoria (ai-inbox-reply)

Apos a busca de knowledge base (linha ~688), adicionar:

```text
// Fetch agent memory for this conversation/lead
if (workspaceId && (conversationId || leadData?.id)) {
  const entityId = leadData?.id || conversationId;
  const entityType = leadData?.id ? 'lead' : 'conversation';
  const { data: memories } = await supabaseAdmin.rpc('retrieve_entity_memories', {
    p_workspace_id: workspaceId,
    p_entity_id: entityId,
    p_entity_type: entityType,
    p_limit: 5
  });
  // Add to system prompt as "## Agent Memory"
}
```

### Detalhe: Classificacao de intencao (ghl-webhook-message)

Chamada leve antes do passo 10:

```text
const intentResponse = await fetch(aiGatewayUrl, {
  body: JSON.stringify({
    model: "google/gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: "Classifica a intencao: sales, support, question. Responde JSON: {intent, confidence}" },
      { role: "user", content: lastInboundMessage }
    ],
    max_tokens: 100
  })
});
```

O resultado e passado ao `ai-inbox-reply` como `detectedIntent: { intent, confidence }`.

### Detalhe: ai_agent_executions no autopilot

Apos o passo 12 (log autopilot event), adicionar:

```text
await supabase.from("ai_agent_executions").insert({
  workspace_id: workspaceId,
  agent_type: "autopilot",
  trigger_type: "auto",
  entity_id: conversationId,
  entity_type: "conversation",
  executive_summary: `Autopilot: ${detectedIntent?.intent || 'unknown'} via ${channel}`,
  input_summary: { channel, lead_id: leadId, message_count: messages.length },
  output: { response_preview: suggestion.substring(0, 200), persona_id: autopilotConfig.persona_id },
  reasoning_trace: { intent: detectedIntent, knowledge_used: true, flow_used: false }
});
```

### Migracao SQL

```text
ALTER TABLE ai_message_audit 
  ADD COLUMN IF NOT EXISTS memory_context JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS detected_intent JSONB DEFAULT '{}';
```

### Sem alteracoes de frontend

Todas as correcoes sao no backend (edge functions + DB). O frontend ja consome os dados atraves dos hooks existentes (useAgentHistory, etc.) e beneficiara automaticamente dos novos registos.
