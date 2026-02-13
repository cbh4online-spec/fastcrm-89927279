
# Bloco 2 – Validacao do Fluxo Operacional

## Resultado da Auditoria

Testei os 10 cenarios contra o codigo existente. Segue o estado de cada um:

| # | Cenario | Estado | Problema |
|---|---------|--------|----------|
| 1 | Receber mensagem inbound | OK | normalize-message.ts trata correctamente |
| 2 | Criar thread nova | OK | normalize-message.ts cria conversa + mensagem |
| 3 | Atualizar thread existente | OK | last_message_at, preview e unread atualizados |
| 4 | Enviar mensagem outbound | PARCIAL | WhatsApp e Instagram send nao atualizam last_message_preview |
| 5 | Atualizar preview | PARCIAL | Mesmo problema do ponto 4 |
| 6 | Alterar status (open-pending-closed) | FALHA | Status "pending" nao existe na DB (CHECK constraint so permite open/closed/archived) |
| 7 | Atribuir operador | OK | useAssignConversation funciona |
| 8 | Reabrir conversa | OK | handleStatusChange("open") funciona |
| 9 | Webhook duplicado | OK | Deduplicacao via external_message_id no normalize-message.ts |
| 10 | Erro de envio | PARCIAL | try/catch existe mas sem retry nem estado visual de falha persistente |

---

## Correcoes Necessarias

### Correcao 1: Adicionar status "pending" ao ciclo de vida

O CHECK constraint da tabela conversations so permite `open | closed | archived`. Precisamos de `pending` para representar "a aguardar resposta do cliente" ou "em espera".

**Migracao SQL:**
```text
ALTER TABLE conversations DROP CONSTRAINT conversations_status_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_status_check 
  CHECK (status IN ('open', 'closed', 'pending', 'archived'));
```

**Codigo (3 ficheiros):**
- `src/hooks/useConversations.ts` — adicionar `"pending"` ao tipo `ConversationStatus`
- `src/components/inbox/ConversationDetail.tsx` — adicionar opcao "Marcar como Pendente" no dropdown + badge visual
- `src/components/inbox/InboxSidebar.tsx` — adicionar filtro/contagem de conversas pendentes

### Correcao 2: last_message_preview em outbound (WhatsApp + Instagram)

As edge functions `whatsapp-send-message` e `instagram-send-message` atualizam `last_message_at` mas nao `last_message_preview` ao enviar mensagens.

**Ficheiros:**
- `supabase/functions/whatsapp-send-message/index.ts` — adicionar `last_message_preview: message.substring(0, 100)` ao update
- `supabase/functions/instagram-send-message/index.ts` — idem

### Correcao 3: Estado visual de erro de envio

Atualmente, se o envio falha, aparece um toast efemero. Nao ha indicacao persistente na timeline.

**Ficheiros:**
- `src/hooks/useMessages.ts` — no onError do mutation, mostrar toast com opcao de retry
- `src/components/inbox/MessageBubble.tsx` — mostrar icone de erro + botao "Reenviar" em mensagens com estado failed (requer passar callback)

---

## Plano Tecnico

| Ficheiro | Tipo | Alteracao |
|---|---|---|
| Migracao SQL | DB | Adicionar "pending" ao CHECK constraint |
| `src/hooks/useConversations.ts` | Editar | Tipo ConversationStatus += "pending" |
| `src/components/inbox/ConversationDetail.tsx` | Editar | Dropdown + badge para "Pendente" |
| `src/components/inbox/InboxSidebar.tsx` | Editar | Contagem de pendentes |
| `supabase/functions/whatsapp-send-message/index.ts` | Editar | last_message_preview no update |
| `supabase/functions/instagram-send-message/index.ts` | Editar | last_message_preview no update |
| `src/hooks/useMessages.ts` | Editar | Retry no onError |
| `src/components/inbox/MessageBubble.tsx` | Editar | Indicador de falha visual |

### Detalhes de implementacao

**Status "pending" no ConversationDetail:**
- Nova opcao no dropdown: icone Clock + "Marcar como Pendente"
- Badge amarelo/laranja quando status === "pending" com label "Pendente"
- handleStatusChange ja suporta qualquer string, basta expandir o tipo

**InboxSidebar - filtro pendentes:**
- Adicionar contagem: `pending: allConversations?.filter(c => c.status === "pending").length || 0`
- Nova opcao no menu lateral

**Retry de envio:**
- No `onError` do `useSendMessage`, adicionar `toast.error` com botao "Reenviar" que re-executa a mutation com os mesmos parametros
- No `MessageBubble`, se a mensagem tem `delivered_at === null` e `direction === 'outbound'` e passou mais de 30s, mostrar icone de alerta

**Edge functions (preview):**
- Linha unica: adicionar `last_message_preview: message.substring(0, 100)` ao objecto de update, junto com `last_message_at`
