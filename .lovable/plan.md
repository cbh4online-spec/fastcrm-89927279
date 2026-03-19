

## Corrigir erro `entity_id` no ComposeButton

### Problema
O `ComposeButton.tsx` tenta inserir campos `entity_id` e `entity_type` na tabela `conversations`, mas esses campos nao existem. A tabela usa `lead_id`, `contact_id` e `company_id`.

### Alteracao

**Ficheiro**: `src/components/inbox/ComposeButton.tsx` (linhas 118-130)

Substituir o insert da conversa para usar os campos corretos:

```typescript
// Antes (errado):
.insert({
  workspace_id: currentWorkspace?.id,
  channel: "email",
  status: "open",
  subject: subject.trim(),
  entity_id: entityId,
  entity_type: entityType,
  last_message_at: new Date().toISOString(),
})

// Depois (correto):
.insert({
  workspace_id: currentWorkspace?.id,
  channel: "email",
  status: "open",
  last_message_at: new Date().toISOString(),
  ...(entityType === 'lead' && entityId ? { lead_id: entityId } : {}),
  ...(entityType === 'contact' && entityId ? { contact_id: entityId } : {}),
  ...(entityType === 'company' && entityId ? { company_id: entityId } : {}),
})
```

Isto tambem resolve o segundo erro (`email-send` retornando 400) porque o insert da conversa falhava antes de chamar a edge function, logo nao havia `conversationId` valido.

