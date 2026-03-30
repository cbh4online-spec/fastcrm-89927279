

# Corrigir botões da sidebar do Inbox (Enviado, Rascunhos, Agendado, Spam, Reciclagem)

## Diagnóstico
Os botões "Enviado", "Rascunhos", "Agendado", "Spam" e "Reciclagem" na sidebar do Inbox não fazem nada porque:
1. Não têm `category` definida no array `folders` (linhas 89-92 de `InboxSidebar.tsx`)
2. O handler `onClick` só executa se `folder.category` existir (linha 145)
3. A `ConversationList` não tem lógica de filtro para estes tipos

A tabela `conversations` tem `status` limitado a `open | closed | pending | archived` — não existe `spam`, `trash`, `draft` ou `scheduled`. Contudo, tem `last_message_direction` que permite filtrar "Enviado".

## Solução
Expandir o sistema de categorias para incluir estes novos tipos como filtros client-side, usando os dados já disponíveis:

| Pasta | Filtro |
|---|---|
| **Enviado** | `last_message_direction = 'outbound'` |
| **Rascunhos** | `status = 'pending'` (proxy mais próximo; conversas sem mensagens enviadas) |
| **Agendado** | Conversas com `sla_deadline` futuro (ou placeholder vazio) |
| **Spam** | `status = 'archived'` + placeholder (sem flag de spam na DB) |
| **Reciclagem** | `status = 'archived'` |

## Plano

### 1. Expandir `InboxCategory` type
Adicionar novos valores: `"sent"`, `"drafts"`, `"scheduled"`, `"spam"`, `"trash"`.

### 2. Atualizar `InboxSidebar.tsx`
- Dar `category` a todas as pastas que não têm
- Remover a condição `folder.category &&` do onClick para garantir que todos os botões funcionam
- Marcar visualmente o item ativo para todas as pastas

### 3. Atualizar `ConversationList.tsx`
- Expandir `categoryToTab` mapping e adicionar filtro por `last_message_direction` para "sent"
- Adicionar lógica de filtro no `tabFilteredConversations` para cada novo tipo
- Para "trash"/"spam": filtrar por `status = 'archived'`

### 4. Atualizar `useConversations.ts`
- Aceitar `last_message_direction` como filtro opcional no hook
- Passar o filtro na query quando categoria é "sent"

### Ficheiros
- **Editado**: `src/components/inbox/InboxSidebar.tsx` — categories em todos os folders + active state
- **Editado**: `src/components/inbox/ConversationList.tsx` — novos filtros por categoria
- **Editado**: `src/hooks/useConversations.ts` — filtro `last_message_direction`

