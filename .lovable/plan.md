

## Fix: Recepcao Duplicada de Mensagens (Autopilot a Disparar Multiplas Vezes)

### Problema Identificado

O Autopilot esta a enviar multiplas respostas para cada mensagem inbound. A conversa do Jorge Cardoso mostra **7 respostas automaticas** para uma unica mensagem inbound ("Vamos testar de novo") — todas em 30 segundos.

### Causas Raiz (3 problemas distintos)

**1. `cron-sync-messages` usa contador global em vez de por-conversa (Blocker)**

Na linha 286, o `messagesCreated` e um acumulador global. Se uma mensagem foi criada para QUALQUER conversa, o autopilot dispara para TODAS as conversas com mensagens inbound recentes nessa iteracao.

**2. `cron-sync-messages` re-processa mensagens a cada 5 segundos (Blocker)**

A janela de 30 minutos (`thirtyMinAgo`) faz com que mensagens recentes sejam verificadas 360 vezes (12 iteracoes/min x 30 min). Mesmo que a insercao falhe por duplicado (unique index), o autopilot e disparado se `messagesCreated > 0` globalmente.

**3. Sem deduplicacao de triggers do Autopilot (High)**

`triggerAutopilotResponse` nao verifica se ja respondeu ao ultimo inbound message. Cada trigger gera uma nova resposta AI independente.

### Solucao

#### Ficheiro 1: `supabase/functions/cron-sync-messages/index.ts`

**Alteracao A** — Contador por conversa em vez de global:
- Mover `messagesCreated` para dentro do loop de conversas (variavel local `convMessagesCreated`)
- Usar `convMessagesCreated > 0` na condicao de trigger do autopilot

**Alteracao B** — Nao disparar autopilot se ultimo outbound e recente:
- Antes de chamar `triggerAutopilot`, verificar se ja existe uma resposta outbound recente (ultimos 60s) para essa conversa
- Se existir, skip do trigger

#### Ficheiro 2: `supabase/functions/ghl-webhook-message/index.ts`

**Alteracao C** — Deduplicar autopilot triggers:
- Na funcao `triggerAutopilotResponse`, antes de gerar resposta AI (passo 8-10), verificar se ja existe um `autopilot_events` com `event_type = 'triggered'` nos ultimos 30 segundos para esta conversa
- Se existir, skip (log e return)

### Detalhes Tecnicos

**`cron-sync-messages/index.ts`** — Alteracao no loop principal (linhas 160-298):

```text
// ANTES (linha 160): messagesCreated global
let messagesCreated = 0;

// DEPOIS: mover para dentro do loop de conversas
for (const ghlConv of recentConversations) {
  let convMessagesCreated = 0;  // POR CONVERSA
  ...
  // Na insercao (linha 271):
  if (!msgError) {
    convMessagesCreated++;
    messagesCreated++;  // manter para stats
    ...
  }
  
  // Na condicao autopilot (linha 286):
  if (recentMessages.length > 0 && convMessagesCreated > 0) {
    // Trigger autopilot
  }
}
```

**`ghl-webhook-message/index.ts`** — Dedup na funcao `triggerAutopilotResponse` (antes da linha 843):

```text
// Verificar trigger recente (ultimos 30s)
const { data: recentTrigger } = await supabase
  .from("autopilot_events")
  .select("id")
  .eq("conversation_id", conversationId)
  .eq("event_type", "triggered")
  .gte("created_at", new Date(Date.now() - 30000).toISOString())
  .limit(1)
  .maybeSingle();

if (recentTrigger) {
  console.log("[AUTOPILOT] Skipping — already triggered in last 30s");
  return;
}
```

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/cron-sync-messages/index.ts` | Contador por conversa + skip se outbound recente |
| `supabase/functions/ghl-webhook-message/index.ts` | Dedup de triggers por tempo (30s cooldown) |

### Resultado Esperado

- Cada mensagem inbound gera no maximo 1 resposta do autopilot
- Cron sync nao re-dispara autopilot para mensagens ja processadas
- Cooldown de 30 segundos previne race conditions entre webhook e cron

