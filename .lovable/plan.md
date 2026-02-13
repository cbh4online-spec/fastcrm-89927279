
## Fix: Autopilot Disparando Multiplas Respostas por Mensagem

### Problema Confirmado (Dados Reais)

Na conversa `1ef06a4a`, apos a mensagem inbound "Vamos testar de novo" as 15:13:03, houve **10 triggers do autopilot** entre 15:13:10 e 15:17:23, resultando em **7 respostas outbound duplicadas**.

### Causa Raiz

Dois problemas combinados:

**1. `cron-sync-messages` re-sincroniza mensagens do GHL a cada 5 segundos**

O cron faz 12 iteracoes/minuto. Cada iteracao busca mensagens dos ultimos 30 min via GHL API. Quando o autopilot envia uma resposta via GHL, essa resposta aparece na proxima chamada da API GHL como uma mensagem "nova". O cron insere-a no DB (e um outbound novo), `convMessagesCreated++`, depois verifica o ultimo inbound — e re-dispara o autopilot. Ciclo vicioso: autopilot responde -> GHL retorna resposta -> cron sincroniza -> detecta novo inbound -> re-dispara.

**2. Dedup window de 30s e insuficiente**

O cooldown de 30s em `ghl-webhook-message` (linha 745) nao cobre o intervalo entre iteracoes do cron (~15-20s), e apos 30s a janela expira, permitindo um novo trigger.

### Solucao (3 correcoes cirurgicas)

#### Correcao 1: `cron-sync-messages` — Nao disparar autopilot se ja existe trigger recente (5 min)

Ficheiro: `supabase/functions/cron-sync-messages/index.ts`

Substituir a verificacao de outbound recente (60s) por uma verificacao de **autopilot trigger recente (5 minutos)** na tabela `autopilot_events`. Isto previne completamente o re-disparo pelo cron.

Linhas 292-313: substituir o bloco de `recentOutbound` por:

```text
// Check if autopilot was already triggered for this conversation in the last 5 min
const { data: recentTrigger } = await supabase
  .from("autopilot_events")
  .select("id")
  .eq("conversation_id", conversationId)
  .eq("event_type", "triggered")
  .gte("created_at", new Date(Date.now() - 300000).toISOString())
  .limit(1)
  .maybeSingle();

if (recentTrigger) {
  console.log("[Cron Sync] Skipping autopilot — already triggered in last 5min", conversationId);
} else {
  triggerAutopilot(...);
}
```

#### Correcao 2: `ghl-webhook-message` — Aumentar dedup window de 30s para 120s

Ficheiro: `supabase/functions/ghl-webhook-message/index.ts`

Linha 745: alterar `30000` para `120000` (2 minutos de cooldown).

#### Correcao 3: `ghl-webhook-message` — Verificar outbound recente ANTES de gerar resposta AI

Ficheiro: `supabase/functions/ghl-webhook-message/index.ts`

Apos o delay (linha 856) e antes de buscar mensagens para contexto (linha 858), adicionar uma verificacao: se ja existe uma resposta outbound enviada apos o ultimo inbound, nao gerar nova resposta. Isto protege contra race conditions onde multiplos triggers estao em paralelo com delays diferentes.

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/cron-sync-messages/index.ts` | Substituir outbound check por autopilot_events check (5 min) |
| `supabase/functions/ghl-webhook-message/index.ts` | Aumentar dedup para 120s + verificacao pos-delay |

### Resultado Esperado

- Cada mensagem inbound gera no maximo 1 trigger do autopilot
- Window de 5 min previne todas as re-execucoes do cron
- Verificacao pos-delay cobre race conditions entre triggers paralelos
