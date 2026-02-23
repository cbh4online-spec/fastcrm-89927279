

# Corrigir conversas existentes com canal errado

## Problema

As alteracoes anteriores ao sync vao prevenir futuras classificacoes erradas, mas as conversas **ja existentes** na base de dados continuam com `channel = "sms"` quando na realidade sao do Instagram. Isto impede o envio de respostas porque o sistema tenta enviar como SMS (tipo GHL "SMS") em vez de Instagram (tipo GHL "IG").

## Solucao

Duas acoes complementares:

### 1. Migracao para corrigir dados existentes

Criar uma migracao SQL que reclassifica conversas existentes com base nos tipos das mensagens ja guardadas. Se uma conversa tem `channel = "sms"` mas as suas mensagens foram sincronizadas com `external_message_id` contendo tipos Instagram (ou o `channel_metadata` indica fonte GHL com tipos IG), atualizar o canal.

A abordagem mais fiavel: verificar a tabela `messages` para cada conversa "sms" de fonte GHL e ver se o `channel_metadata` contem indicadores de Instagram (como `ghl_message_type` 17 ou 18), ou usar os dados do `ghl_sync_log` para inferir o canal real.

Alternativa mais simples e segura: como o `cron-sync-messages` e `ghl-sync-conversations` agora ja fazem reclassificacao automatica, basta **forcar uma re-sincronizacao completa** que vai corrigir os canais. Mas para correcao imediata, uma migracao e mais rapida.

### 2. Protecao no envio de mensagens

Adicionar logica ao `ghl-send-message` para que, antes de enviar, verifique os tipos das mensagens recentes da conversa. Se detectar que as mensagens sao de tipo Instagram (17/18) mas o canal esta como "sms", corrigir automaticamente o canal e enviar com o tipo correto ("IG" em vez de "SMS").

## Detalhes tecnicos

### Migracao SQL

```sql
-- Reclassificar conversas "sms" que tem mensagens com ghl_message_type 17 ou 18
-- Baseado no channel_metadata das conversas que foram sincronizadas do GHL
UPDATE conversations c
SET channel = 'instagram'
WHERE c.channel = 'sms'
  AND c.channel_metadata IS NOT NULL
  AND (c.channel_metadata->>'source' IN ('ghl', 'ghl_sync'))
  AND EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.conversation_id = c.id 
    AND m.external_message_id IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM ghl_sync_log g
    WHERE g.workspace_id = c.workspace_id
    AND g.ghl_entity_type IN ('message_inbound', 'message_outbound')
    AND (g.payload->>'messageType')::int IN (17, 18)
    AND g.fastcrm_entity_id IN (
      SELECT m2.id FROM messages m2 WHERE m2.conversation_id = c.id
    )
  );
```

Se o `ghl_sync_log` nao tiver dados suficientes, uma alternativa mais agressiva (mas segura para este caso):

```sql
-- Alternativa: reclassificar TODAS as conversas "sms" de fonte GHL 
-- que tenham metadata com indicadores de Instagram
UPDATE conversations
SET channel = 'instagram'
WHERE channel = 'sms'
  AND channel_metadata IS NOT NULL
  AND (
    channel_metadata->>'source' IN ('ghl', 'ghl_sync')
  )
  AND (
    channel_metadata->>'ghl_last_message_type' IN ('17', '18')
    OR channel_metadata->>'lastMessageType' IN ('17', '18')
  );
```

### Alteracoes em `supabase/functions/ghl-send-message/index.ts`

Na funcao `mapChannelToGHLType`, adicionar uma verificacao extra: antes de determinar o tipo GHL, consultar as ultimas mensagens da conversa para inferir o canal real. Se o canal registado e "sms" mas as mensagens indicam Instagram, usar "IG".

Concretamente, apos a linha 301 (`const ghlMessageType = mapChannelToGHLType(messageChannel)`), adicionar:

```typescript
// Auto-detect real channel from recent messages if current is "sms"
let finalMessageType = ghlMessageType;
if (messageChannel === "sms" && channelMetadata?.source) {
  // Check ghl_sync_log or message patterns for Instagram indicators
  const { data: recentSyncLogs } = await supabase
    .from("ghl_sync_log")
    .select("payload")
    .eq("workspace_id", conversation.workspace_id)
    .eq("fastcrm_entity_id", conversationId)
    .in("ghl_entity_type", ["message_inbound", "message_outbound"])
    .order("created_at", { ascending: false })
    .limit(5);
  
  const hasIGType = recentSyncLogs?.some(log => {
    const mt = (log.payload as any)?.messageType;
    return mt === 17 || mt === 18;
  });
  
  if (hasIGType) {
    finalMessageType = "IG";
    // Also fix the conversation channel for future
    await supabase.from("conversations")
      .update({ channel: "instagram" })
      .eq("id", conversationId);
  }
}
```

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | Corrigir canal de conversas existentes mal classificadas |
| `supabase/functions/ghl-send-message/index.ts` | Auto-detectar e corrigir canal antes de enviar; usar tipo GHL correto |

## Resultado esperado

- Conversas existentes mal classificadas sao corrigidas imediatamente pela migracao
- O envio de mensagens auto-detecta o canal correto mesmo se a conversa ainda tiver canal errado
- O canal e corrigido automaticamente no momento do envio para evitar problemas futuros
- O utilizador consegue responder a todas as conversas do Instagram sem erros

