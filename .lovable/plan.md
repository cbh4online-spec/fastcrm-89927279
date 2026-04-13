

## Plano: Filtrar Mensagens GHL pelos Canais Sociais Activos

### Diagnóstico
A tabela `workspace_ghl_social_channels` e o UI de selecção de canais existem e funcionam. Contudo, as edge functions que processam mensagens (`ghl-webhook-message` e `ghl-sync-conversations`) **não consultam esta tabela** — aceitam mensagens de todos os canais indiscriminadamente. A selecção de páginas/perfis é puramente cosmética.

### Alterações Necessárias

**1. `supabase/functions/ghl-webhook-message/index.ts`**
Após resolver o `channel` e identificar o `workspace_id` (via location_id → workspace_ghl_config), adicionar uma verificação:
- Consultar `workspace_ghl_social_channels` para o workspace
- Se existirem canais configurados (registos na tabela), verificar se o `channel_type` da mensagem recebida tem pelo menos um registo `is_active = true`
- Se não estiver activo → ignorar a mensagem silenciosamente (log + return 200)
- Se não existirem canais configurados (tabela vazia para o workspace) → aceitar tudo (comportamento retrocompatível)

**2. `supabase/functions/ghl-sync-conversations/index.ts`**
Antes de processar cada conversa do GHL durante a sincronização:
- Carregar os canais activos do workspace uma vez no início
- Para cada conversa, verificar se o canal está permitido
- Ignorar conversas de canais não activos

**3. `supabase/functions/ghl-send-message/index.ts`**
Antes de enviar uma mensagem via GHL:
- Verificar se o canal de destino está activo para o workspace
- Bloquear envio se o canal não estiver autorizado (retornar erro claro)

### Lógica de Filtragem (partilhada)

```typescript
// Verificar se canal está permitido
async function isChannelAllowed(supabase, workspaceId: string, channelType: string): Promise<boolean> {
  const { data: configuredChannels } = await supabase
    .from("workspace_ghl_social_channels")
    .select("channel_type, is_active")
    .eq("workspace_id", workspaceId);
  
  // Se não há canais configurados, aceitar tudo (retrocompatível)
  if (!configuredChannels?.length) return true;
  
  // Se há canais configurados, verificar se este está activo
  return configuredChannels.some(c => c.channel_type === channelType && c.is_active);
}
```

### Mapeamento de canais GHL → channel_type
- `instagram` → `instagram`
- `messenger`, `facebook` → `facebook`  
- `whatsapp` → `whatsapp`
- `sms`, `phone`, `email` → sempre permitidos (não são redes sociais)

### Ficheiros Afectados
1. `supabase/functions/ghl-webhook-message/index.ts` — filtrar mensagens inbound
2. `supabase/functions/ghl-sync-conversations/index.ts` — filtrar conversas na sincronização
3. `supabase/functions/ghl-send-message/index.ts` — bloquear envio por canais não autorizados

### Impacto
- Retrocompatível: workspaces sem canais configurados continuam a receber tudo
- Workspaces com canais seleccionados passam a receber/enviar apenas dos canais activos
- Sem alterações de schema (tabela já existe)

