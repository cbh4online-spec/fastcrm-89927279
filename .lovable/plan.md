

# Correcao: Mensagens nao actualizam em tempo real + impossibilidade de responder

## Problema identificado

Existem dois problemas relacionados com o cliente Supabase utilizado para operacoes de mensagens:

### 1. Realtime nao funciona (mensagens nao actualizam)

O hook `useMessages` (linha 67) usa `workspaceClient` para criar a subscricao Realtime:

```text
const channel = workspaceClient
  .channel(`messages-${conversationId}`)
  .on("postgres_changes", ...)
```

Enquanto o hook `useConversations` (linha 86) usa correctamente o cliente principal `supabase`:

```text
const channel = supabase
  .channel(`conversations-realtime-${currentWorkspace.id}`)
  .on("postgres_changes", ...)
```

Quando o `workspaceClient` e um cliente dinamico (criado via `createDynamicClient`), este cliente nao partilha a sessao autenticada do cliente principal. Resultado: a subscricao Realtime falha silenciosamente porque o cliente dinamico nao tem token de autenticacao valido, e as policies RLS bloqueiam o acesso.

### 2. Impossibilidade de responder

O `useSendMessage` (linha 270) usa `workspaceClient` para inserir mensagens directamente na tabela `messages`:

```text
const { data: message, error: messageError } = await workspaceClient
  .from("messages")
  .insert({...})
```

A tabela `messages` tem RLS activo com a policy:

```sql
CREATE POLICY "Members can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
```

Se o `workspaceClient` nao tem sessao valida, `auth.uid()` retorna `null` e a policy bloqueia o INSERT.

## Solucao

Alterar o `useMessages` para usar o cliente principal `supabase` (importado de `@/integrations/supabase/client`) para a subscricao Realtime, seguindo o mesmo padrao que o `useConversations` ja usa com sucesso.

Adicionalmente, apos o envio de uma mensagem, fazer `refetch` imediato das mensagens para garantir que a UI actualiza instantaneamente (sem depender apenas do Realtime).

---

## Detalhes tecnicos

### Ficheiro: `src/hooks/useMessages.ts`

**Alteracao 1 -- Realtime subscription (linhas 63-87)**

Substituir `workspaceClient` por `supabase` (cliente principal) na subscricao Realtime:

```typescript
import { supabase } from "@/integrations/supabase/client";

// Dentro do useEffect de realtime:
const channel = supabase  // <-- usar supabase em vez de workspaceClient
  .channel(`messages-${conversationId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace.id] });
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(channel);  // <-- usar supabase
};
```

Remover `workspaceClient` das dependencias do useEffect ja que deixa de ser necessario.

**Alteracao 2 -- Refetch imediato apos envio (linhas 302-307)**

No `onSuccess` do `useSendMessage`, adicionar `refetchQueries` em vez de apenas `invalidateQueries` para garantir actualizacao imediata:

```typescript
onSuccess: (data, variables) => {
  recordMessage(data.conversation_id, "outbound", variables.isAutomated);
  
  // Refetch imediato para actualizar a UI sem esperar pelo Realtime
  queryClient.refetchQueries({ queryKey: ["messages", data.conversation_id] });
  queryClient.invalidateQueries({ queryKey: ["conversations", currentWorkspace?.id] });
},
```

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useMessages.ts` | Usar `supabase` no Realtime + refetch imediato apos envio |

### Impacto

- Mensagens inbound aparecem em tempo real (subscricao Realtime funcional)
- Respostas enviadas aparecem instantaneamente na UI (refetch imediato)
- Zero breaking changes -- apenas corrige o cliente usado internamente
- Segue o padrao ja estabelecido pelo `useConversations`

