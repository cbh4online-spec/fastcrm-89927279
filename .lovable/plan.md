
# Corrigir Sincronização de Mensagens GHL

## Problema Identificado

A mensagem "Teste 3" foi recebida com sucesso às 23:17:27, mas falhou ao guardar na base de dados porque a Edge Function tenta inserir colunas que não existem na tabela `messages`:

```
Could not find the 'extension' column of 'messages' in the schema cache
```

**Colunas que a função tenta usar (não existem):**
- `topic`
- `extension`
- `payload`

**Colunas disponíveis na tabela:**
- `content`, `direction`, `sent_at`, `ghl_message_id`, `attachments`, `conversation_id`, `workspace_id`, `external_message_id`

---

## Solução

Actualizar a Edge Function `ghl-webhook-message` para usar apenas as colunas que existem na tabela.

---

## Alterações Técnicas

### Ficheiro: `supabase/functions/ghl-webhook-message/index.ts`

Remover os campos inválidos do INSERT e mover metadados GHL para o campo `attachments` como JSON (aproveitando a estrutura existente):

```typescript
// ANTES (inválido):
.insert({
  conversation_id: conversationId,
  workspace_id: workspaceId,
  content: messageContent,
  direction: messageDirection,
  topic: channel,           // ❌ Não existe
  extension: "ghl",         // ❌ Não existe
  sent_at: messageSentAt,
  ghl_message_id: ghlMessageId,
  attachments: formattedAttachments,
  payload: { ... }          // ❌ Não existe
})

// DEPOIS (corrigido):
.insert({
  conversation_id: conversationId,
  workspace_id: workspaceId,
  content: messageContent,
  direction: messageDirection,
  sent_at: messageSentAt,
  ghl_message_id: ghlMessageId,
  external_message_id: ghlMessageId,
  attachments: formattedAttachments.length > 0 ? formattedAttachments : null
})
```

---

## Resultado Esperado

Após a correcção:
1. As mensagens do GHL serão guardadas correctamente na base de dados
2. A conversa já criada será actualizada com as novas mensagens
3. O histórico de mensagens aparecerá no detalhe do lead

---

## Passos de Validação

1. Deploy da Edge Function corrigida
2. Enviar nova mensagem de teste no GHL
3. Verificar que a mensagem aparece no FastCRM
