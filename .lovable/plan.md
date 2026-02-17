

# Sincronizacao GHL com actualizacao em tempo real

## Problema actual
Os hooks `useGHLContactSync` e `useGHLConversationSync` fazem a sincronizacao via SSE streaming (mostrando progresso), mas quando terminam **nao actualizam os dados na interface**. O utilizador tem de fazer refresh manual para ver os novos contactos/conversas importados.

## Solucao
Adicionar invalidacao de cache do react-query apos a sincronizacao completar, para que as listas de leads e conversas se actualizem automaticamente.

## Alteracoes

### 1. `src/hooks/useGHLContactSync.ts`
- Importar `useQueryClient` do `@tanstack/react-query`
- Apos o sync completar com sucesso (quando `result` existe), invalidar:
  - `queryKey: ["leads"]` -- para actualizar a lista de leads
  - `queryKey: ["leads", workspaceId]` -- queries filtradas por workspace
- A invalidacao acontece no bloco `finally` ou logo apos receber o evento `complete`

### 2. `src/hooks/useGHLConversationSync.ts`
- Importar `useQueryClient` do `@tanstack/react-query`
- Apos o sync completar com sucesso, invalidar:
  - `queryKey: ["conversations"]` -- para actualizar a lista de conversas
  - `queryKey: ["messages"]` -- para actualizar mensagens se necessario
- Isto garante que o Inbox reflecte imediatamente as novas conversas importadas

### Detalhes tecnicos

As tabelas `conversations` e `messages` ja tem Supabase Realtime activado (migration `20260113185623`), portanto novos registos inseridos pelo edge function ja disparam eventos realtime. O hook `useConversations` ja subscreve a esses eventos (linha 97).

O principal gap e que o hook de sync nao forca uma re-fetch dos dados via react-query. Ao adicionar `invalidateQueries` no momento do `complete`, os dados actualizam-se instantaneamente na UI sem necessidade de refresh.

Para leads, como nao ha subscricao realtime na tabela `leads`, a invalidacao de cache e essencial para que a lista se actualize.

