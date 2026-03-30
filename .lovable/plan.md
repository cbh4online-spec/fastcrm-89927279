

# Corrigir lógica de filtragem da Inbox e adicionar filtro por canal

## Diagnóstico
1. **"Caixa de entrada"** filtra por `status=open` sem distinguir direção — deveria mostrar apenas mensagens **recebidas** (`last_message_direction = 'inbound'` ou todas as abertas, que é o comportamento padrão)
2. **"Enviado"** filtra por `last_message_direction = 'outbound'` mas também aplica `status=open` (via `getStatusFromCategory` que retorna "open" por defeito) — deveria mostrar **todas** as conversas onde a última mensagem foi enviada pelo utilizador, independentemente do status
3. **Filtro por canal** (WhatsApp, Email, Instagram, etc.) não existe na sidebar — o utilizador precisa de filtrar por canal recebido
4. O `selectedChannel` já é passado da `InboxSidebar` → `InboxView` → `ConversationList`, mas a sidebar não tem UI para selecionar canais

## Alterações

### 1. Corrigir lógica `getStatusFromCategory` em `ConversationList.tsx`
- **"all" (Caixa de entrada)**: manter `status=open` (mensagens abertas, recebidas e enviadas — comportamento padrão de inbox)
- **"sent"**: não filtrar por status (remover `status=open`), apenas por `last_message_direction=outbound`
- **"drafts"**: `status=pending`
- **"spam"/"trash"**: `status=archived`
- **"scheduled"**: `status=open` + placeholder (sem dados reais de agendamento ainda)

### 2. Adicionar filtro por canal na sidebar (`InboxSidebar.tsx`)
- Nova secção colapsável **"Canais"** entre Pastas e Vistas
- Ícones para cada canal: Email, WhatsApp, Instagram, Facebook, SMS, GHL, Telefone, Webchat
- Ao clicar num canal, chama `onChannelChange` com o canal correspondente
- Botão "Todos" para limpar o filtro de canal
- Mostrar contagem de conversas por canal

### 3. Ajustar `useConversations.ts`
- Tornar o filtro `status` verdadeiramente opcional (quando `undefined`, não aplicar `.eq("status", ...)`)
- Actualmente já suporta `lastMessageDirection` e `channel`

### 4. Ajustar `ConversationList.tsx`
- Quando `categoryFilter === "sent"`, passar `status: undefined` (sem filtro de status)
- Garantir que o `channelFilter` externo é sempre aplicado correctamente

### Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `src/components/inbox/InboxSidebar.tsx` | Adicionar secção "Canais" com botões por canal |
| `src/components/inbox/ConversationList.tsx` | Corrigir `getStatusFromCategory` para "sent" não forçar status |
| `src/hooks/useConversations.ts` | Garantir que `status=undefined` não aplica filtro |

### Fluxo corrigido
- **Caixa de entrada** → `status=open` (todas abertas)
- **Enviado** → `lastMessageDirection=outbound`, sem filtro de status
- **Rascunhos** → `status=pending`
- **Spam/Reciclagem** → `status=archived`
- **Filtro canal** → `channel=email|whatsapp|...` combinado com qualquer pasta

