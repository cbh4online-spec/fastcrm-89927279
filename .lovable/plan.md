
# Plano: WhatsApp Conversation Management — Integração com Inbox Existente

## A. Diagnóstico

O FastCRM **já tem um inbox omnichannel production-grade** com todas as funcionalidades pedidas:

| Funcionalidade | Estado |
|---|---|
| Layout 3 colunas (sidebar + lista + thread + context panel) | ✅ Implementado |
| Pesquisa, filtros, tabs, pinning, bulk actions | ✅ Implementado |
| Message bubbles com delivery status, date separators | ✅ Implementado |
| Context panel com AI, Summary, Lead, Actions | ✅ Implementado |
| Assignment, status (open/closed/pending/archived) | ✅ Implementado |
| Tags (ai_tags, user_tags) | ✅ Implementado |
| Notas internas via entity_notes | ✅ Implementado |
| Realtime via postgres_changes | ✅ Implementado |
| AI composer com sugestões e templates | ✅ Implementado |
| CRM integration (lead/contact/company/opportunity) | ✅ Implementado |
| Keyboard shortcuts, Sales columns view | ✅ Implementado |
| WhatsApp QR connection + settings card | ✅ Implementado |

### O que falta (3 lacunas específicas):

1. **Inbound webhook** — Não existe edge function para receber mensagens inbound da Evolution API e criar conversations/messages no inbox
2. **Outbound routing** — O hook `useSendMessage` não encaminha mensagens WhatsApp (non-GHL) via `whatsapp-evolution-send`
3. **WhatsApp connection awareness** — O inbox não mostra o estado da conexão WhatsApp QR

**Resultado actual:** 0 conversas WhatsApp no DB. O sistema está pronto mas não tem o "tubo" de entrada/saída ligado à Evolution API.

---

## B. Ficheiros a Criar/Alterar

| Ficheiro | Acção | Descrição |
|---|---|---|
| `supabase/functions/whatsapp-evolution-inbound/index.ts` | CRIAR | Webhook para receber mensagens inbound da Evolution API |
| `src/hooks/useMessages.ts` | EDITAR | Adicionar routing WhatsApp QR no `useSendMessage` |
| `src/components/inbox/ConversationDetail.tsx` | EDITAR | Mostrar banner de estado WhatsApp quando canal é whatsapp |
| `src/components/inbox/InboxView.tsx` | EDITAR | Adicionar indicador de conexão WhatsApp no header |

---

## C. Detalhes Técnicos

### 1. Edge Function: `whatsapp-evolution-inbound`

Recebe webhooks da Evolution API com mensagens inbound. Responsabilidades:
- Validar workspace via instance_name (`ws_{workspaceId}`)
- Identificar ou criar lead pelo número de telefone
- Identificar ou criar conversation (channel=whatsapp)
- Inserir mensagem na tabela `messages`
- Actualizar `last_message_at`, `last_message_preview`, `unread_count` na conversation
- Usar `external_message_id` para idempotência (evitar duplicados)
- Suportar tipos: text, image, audio, video, document
- Logs estruturados com workspace_id, phone, message_id

### 2. Routing WhatsApp no `useSendMessage`

Adicionar bloco antes do fallback "other channels":
```typescript
// For WhatsApp via Evolution QR (not GHL)
if (conversation.channel === "whatsapp" && !isGHLConversation) {
  const { data, error } = await mainClient.functions.invoke("whatsapp-evolution-send", {
    body: { workspaceId: currentWorkspace.id, phone: recipientPhone, message: content }
  });
  // persist message, return
}
```

Extrair número de telefone de `channel_metadata.phone` ou do lead associado.

### 3. Connection Awareness no Inbox

Pequeno badge no header do InboxView quando existem conversas WhatsApp:
- Verde: "WhatsApp Conectado"
- Vermelho: "WhatsApp Desconectado"

Usa o hook `useWhatsAppQRConnection` já existente.

### 4. Evolution API Webhook Configuration

Após deploy, configurar webhook na Evolution API para:
`https://{SUPABASE_URL}/functions/v1/whatsapp-evolution-inbound`

Events: `messages.upsert` (mensagens recebidas)

---

## D. O que NÃO precisa ser alterado

- ConversationList — já filtra por canal WhatsApp
- InboxSidebar — já tem filtro por canal WhatsApp
- InboxContextPanel — já mostra lead, tags, notas, assignment, CRM actions
- MessageBubble — já suporta inbound/outbound com delivery status
- Realtime subscriptions — já existem em conversations e messages
- ConversationDetail — já funciona com qualquer canal
- AIMessageComposer — já funciona com qualquer canal
- DB schema (conversations, messages) — já tem todas as colunas necessárias

---

## E. Critérios de Aceitação

1. Mensagens inbound WhatsApp criam automaticamente conversas no inbox
2. Mensagens outbound WhatsApp são enviadas via Evolution API
3. Conversas WhatsApp aparecem na lista com ícone e filtro correcto
4. Estado da conexão WhatsApp visível no inbox
5. Sem duplicação de mensagens (idempotência via external_message_id)
6. Sem regressão nos canais existentes (email, SMS, Instagram, GHL)
