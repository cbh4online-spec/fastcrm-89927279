
## Conectar Autopilot dos AI Agents ao Sistema de Resposta Automatica

### Problema

O autopilot esta configurado e ativo no agente "Redes Sociais IG" (`ai_agents` com `autopilotEnabled: true`), mas o sistema de resposta automatica na edge function `ghl-webhook-message` so consulta a tabela `autopilot_config` -- que e o sistema antigo. O agente tem persona, base de conhecimento e configuracoes de delay definidas, mas nada disto e usado porque as duas tabelas nao estao conectadas.

Adicionalmente, o autopilot so e acionado via webhook do GHL (`ghl-webhook-message`), o que significa que so funciona quando o GHL envia notificacoes em tempo real. Mensagens importadas pelo batch sync (`ghl-sync-conversations`) nunca acionam o autopilot.

### Solucao

**1. Atualizar `triggerAutopilotResponse` para consultar `ai_agents`**

Quando a funcao nao encontrar config na tabela `autopilot_config`, deve tambem verificar a tabela `ai_agents` para o canal da conversa. Se encontrar um agente ativo com `autopilotEnabled: true`, usar as definicoes do agente (persona, delays, knowledge base, limites).

Fluxo de decisao:
```text
1. Verificar autopilot_config (sistema legado) -> se encontrar, usar
2. Se nao, verificar ai_agents para o canal -> se autopilotEnabled, usar
3. Se nenhum, nao responder automaticamente
```

**2. Usar persona e knowledge base do agente**

Quando o autopilot e acionado via `ai_agents`, passar:
- `personaId` do agente para a chamada `ai-inbox-reply`
- IDs da base de conhecimento para contexto
- Definicoes de delay, limites e horarios do agente

**3. Acionar autopilot no batch sync**

Apos sincronizar mensagens novas inbound no `ghl-sync-conversations`, verificar se existe autopilot ativo e acionar resposta automatica para as mensagens mais recentes que ainda nao tiveram resposta.

### Detalhes Tecnicos

**Ficheiro 1**: `supabase/functions/ghl-webhook-message/index.ts`

Modificar `triggerAutopilotResponse` (linhas 608-848):

- Apos a query a `autopilot_config` que retorna null, adicionar fallback para `ai_agents`:
```text
// Fallback: check ai_agents for this channel
if (!autopilotConfig) {
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .eq("channel", channel)
    .maybeSingle();

  if (agent?.settings?.autopilotEnabled) {
    // Map agent settings to autopilot config format
    autopilotConfig = {
      id: agent.id,
      is_active: true,
      persona_id: agent.persona_id,
      response_delay_min: Math.floor((agent.settings.responseDelayMs || 8000) / 1000),
      response_delay_max: Math.floor((agent.settings.responseDelayMs || 8000) / 1000) + 4,
      max_messages_per_conversation: agent.settings.maxMessagesPerConversation || 25,
      sleep_on_human_reply: agent.settings.sleepOnHumanReply ?? true,
      respect_working_hours: agent.settings.respectWorkingHours ?? false,
      working_hours_start: agent.settings.workingHoursStart || "09:00",
      working_hours_end: agent.settings.workingHoursEnd || "18:00",
      working_days: agent.settings.workingDays || [1,2,3,4,5],
      timezone: "Europe/Lisbon",
      out_of_hours_message: agent.settings.outOfHoursMessage || null,
      config_scope: "channel",
      source: "ai_agent"  // Track where config came from
    };
    console.log("[AUTOPILOT] Using ai_agents config", { agentId: agent.id, agentName: agent.name });
  }
}
```

- Tambem modificar a chamada a `ai-inbox-reply` para incluir a knowledge base do agente quando source for `ai_agent`

**Ficheiro 2**: `supabase/functions/ghl-sync-conversations/index.ts`

Apos inserir mensagens novas inbound, verificar se o autopilot esta ativo e acionar para a ultima mensagem inbound nao respondida:

```text
// After syncing messages, trigger autopilot for latest unanswered inbound
if (newInboundMessages > 0 && lastMessageIsInbound) {
  triggerAutopilotForSyncedMessage(supabase, supabaseUrl, supabaseServiceKey, {
    workspaceId, conversationId, channel, leadId, ghlContactId, locationId
  });
}
```

Adicionar funcao helper `triggerAutopilotForSyncedMessage` que reutiliza a mesma logica do `ghl-webhook-message` chamando a edge function diretamente:

```text
async function triggerAutopilotForSyncedMessage(...) {
  // Call ghl-webhook-message's autopilot logic via internal function call
  await fetch(`${supabaseUrl}/functions/v1/ghl-webhook-message`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "autopilot_trigger",  // Special type to just trigger autopilot
      ...params
    })
  });
}
```

**Alternativa mais limpa**: Extrair a logica de autopilot para uma edge function separada `autopilot-respond` que pode ser chamada tanto pelo webhook como pelo sync.

Vou optar pela abordagem mais simples: adicionar o fallback para `ai_agents` no `ghl-webhook-message` e acionar o autopilot no `ghl-sync-conversations` chamando internamente a funcao.

### Resultado Esperado

- O autopilot usara automaticamente as configuracoes do agente IA quando nao houver config legacy
- A persona e base de conhecimento do agente serao usadas nas respostas automaticas
- Mensagens sincronizadas pelo batch sync tambem acionarao o autopilot
- O sistema respeita todos os limites (horarios, max mensagens, pausa com resposta humana)
