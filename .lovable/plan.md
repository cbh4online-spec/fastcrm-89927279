
## Receber Mensagens Automaticamente no Inbox (Realtime)

### Problema

Os webhooks (GHL, WhatsApp, Instagram) ja recebem mensagens e guardam na base de dados automaticamente. A tabela `conversations` e `messages` ja tem realtime ativado. No entanto, o hook `useConversations` nao tem subscricao realtime -- so atualiza quando o utilizador navega ou faz refresh manual. Isto faz parecer que o sistema nao recebe mensagens.

### Solucao

Adicionar subscricoes realtime ao hook `useConversations` para que a lista de conversas atualize instantaneamente quando chegam novas mensagens via webhook.

### O que sera feito

**1. Adicionar realtime ao `useConversations`**

Modificar `src/hooks/useConversations.ts` para incluir uma subscricao `postgres_changes` na tabela `conversations`, filtrando por `workspace_id`. Quando houver INSERT, UPDATE ou DELETE, invalida automaticamente a query cache do React Query, fazendo o UI atualizar.

**2. Adicionar realtime ao `ConversationList`**

Garantir que o componente `ConversationList` tambem escuta mudancas na tabela `messages` para atualizar contadores e previews quando chega uma nova mensagem (o hook `useMessages` ja tem realtime, mas apenas para a conversa selecionada).

**3. Notificacao visual de nova mensagem**

Adicionar um efeito sonoro ou visual (badge a piscar, toast) quando chega uma nova conversa ou mensagem inbound para chamar a atencao do utilizador.

---

### Detalhes Tecnicos

**Ficheiro**: `src/hooks/useConversations.ts`
- Adicionar `useEffect` com `supabase.channel('conversations-realtime-{workspaceId}')` que escuta `postgres_changes` em `conversations` filtrado por `workspace_id`
- No callback, chamar `queryClient.invalidateQueries({ queryKey: ['conversations'] })` para refrescar a lista
- Limpar canal no cleanup do useEffect
- Seguir o mesmo padrao ja usado em `useMessages.ts`, `useCrmActivities.ts`, etc.

**Ficheiro**: `src/components/inbox/ConversationList.tsx`
- Adicionar subscricao realtime na tabela `messages` (sem filtro de conversation_id) para captar qualquer nova mensagem no workspace
- Ao receber nova mensagem, invalidar queries de conversations para atualizar previews e contadores

**Ficheiro**: `src/components/inbox/InboxSidebar.tsx`
- As contagens ja dependem de `useConversations`, portanto atualizam automaticamente com o realtime

Nao e necessaria nenhuma migracao de base de dados -- o realtime ja esta ativado para ambas as tabelas.
