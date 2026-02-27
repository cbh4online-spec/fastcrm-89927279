

# Corrigir Persistência de Mensagens GHL e Email

## Problemas Identificados

### 1. Conversas duplicadas por formato inconsistente de `external_thread_id`
O `cron-sync-messages` usa o ID GHL directo (ex: `DIZQJULRuNQPcMHSPJbQ`) enquanto o `ghl-sync-conversations` prefixa com `ghl_` (ex: `ghl_DIZQJULRuNQPcMHSPJbQ`). Isto cria duas conversas para o mesmo contacto -- uma com mensagens, outra vazia.

### 2. Limite de 1000 rows na query de deduplicação de mensagens
O `ghl-sync-conversations` carrega TODAS as `ghl_message_id` existentes para o workspace numa só query. Se houver mais de 1000 mensagens, o Supabase trunca silenciosamente e mensagens novas são tratadas como duplicadas e saltadas.

### 3. `cron-sync-messages` só busca mensagens das últimas 2 horas
Mensagens mais antigas nunca são sincronizadas pela cron. Se a sync falhar durante esse intervalo, essas mensagens perdem-se permanentemente.

## Alterações

### `supabase/functions/ghl-sync-conversations/index.ts`
1. **Normalizar `external_thread_id`**: Usar formato consistente `ghl_{id}`. Antes de criar conversa, verificar também pelo ID sem prefixo para evitar duplicações.
2. **Paginar query de mensagens existentes**: Substituir a query única por loop paginado (1000 em 1000) para carregar TODAS as `ghl_message_id` existentes sem truncamento.

### `supabase/functions/cron-sync-messages/index.ts`
1. **Normalizar `external_thread_id`**: Usar `ghl_${ghlConvId}` em vez do ID raw, e na lookup verificar ambos os formatos.
2. **Expandir janela temporal**: Aumentar de 2 horas para 24 horas para capturar mensagens que possam ter sido perdidas em invocações anteriores.

### Migração SQL
1. **Consolidar conversas duplicadas**: Mover mensagens das conversas com thread_id raw para as com prefixo `ghl_`, depois eliminar as vazias/duplicadas.
2. **Normalizar thread_ids existentes**: UPDATE para adicionar prefixo `ghl_` a todos os `external_thread_id` que não o tenham.

### `supabase/functions/email-fetch/index.ts`
1. **Deduplicação por `email_message_id`**: Antes de inserir, verificar se já existe mensagem com o mesmo `email_message_id` para evitar duplicados em re-syncs.

## Detalhe Técnico

A paginação de mensagens existentes:
```typescript
const existingMessageIds = new Set<string>();
let offset = 0;
const PAGE_SIZE = 1000;
while (true) {
  const { data } = await supabase
    .from("messages")
    .select("ghl_message_id")
    .eq("workspace_id", workspace_id)
    .not("ghl_message_id", "is", null)
    .range(offset, offset + PAGE_SIZE - 1);
  if (!data || data.length === 0) break;
  data.forEach(m => existingMessageIds.add(m.ghl_message_id));
  if (data.length < PAGE_SIZE) break;
  offset += PAGE_SIZE;
}
```

A normalização de thread_id no lookup:
```typescript
let conversationId = convsByThreadId.get(`ghl_${ghlConvId}`)
  || convsByThreadId.get(ghlConvId);
```

