
# Corrigir sugestao AI prematura e preview da lista de conversas

## Problema 1: AI sugere resposta quando o cliente ainda nao respondeu

Na imagem, a conversa so tem uma mensagem outbound (enviada pelo utilizador). Ainda assim, o AI gerou uma sugestao de resposta. Isto nao faz sentido -- o AI so deve sugerir respostas quando a ultima mensagem for do cliente (inbound), caso contrario esta a "responder a si proprio".

### Solucao

No ficheiro `src/components/inbox/AIMessageComposer.tsx`:

1. Na funcao `handleSuggestReply`, verificar se a ultima mensagem e inbound antes de gerar sugestoes
2. Se a ultima mensagem for outbound, mostrar um aviso ao utilizador: "O cliente ainda nao respondeu. Aguarde uma resposta antes de pedir sugestoes."
3. Permitir override com um clique adicional caso o utilizador queira forcar a sugestao (ex: para gerar follow-up)

Logica:

```text
handleSuggestReply:
  lastMessage = messages[messages.length - 1]
  if lastMessage.direction === "outbound":
    toast.info("O cliente ainda nao respondeu. Aguarde uma resposta.")
    return (sem chamar AI)
```

Tambem desativar visualmente o botao "Sugerir resposta" quando a ultima mensagem for outbound, com tooltip explicativo.

---

## Problema 2: Lista de conversas corta mensagens sem contexto

O preview da ultima mensagem na lista lateral:
- Usa `truncate` que corta o texto numa unica linha sem indicacao de quem enviou
- Nao mostra se a mensagem e do cliente ou do utilizador
- Nao se percebe se esta alinhado pela mensagem mais recente

### Solucao

No ficheiro `src/components/inbox/ConversationList.tsx`:

1. Adicionar prefixo ao preview indicando a direcao: "Voce: ..." para outbound, sem prefixo para inbound
2. Aumentar o preview para 2 linhas usando `line-clamp-2` em vez de `truncate` (1 linha)
3. Garantir que o `last_message_preview` ja reflete a mensagem mais recente (verificar query)

Alteracao concreta na linha 387-389:

```text
// ANTES
<p className="text-xs text-muted-foreground truncate mt-0.5">
  {conv.last_message_preview}
</p>

// DEPOIS
<p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
  {conv.last_message_direction === "outbound" && (
    <span className="font-medium text-foreground/70">Voce: </span>
  )}
  {conv.last_message_preview}
</p>
```

Nota: preciso verificar se o campo `last_message_direction` existe na query de conversas. Se nao existir, adicionar ao hook `useConversations`.

---

## Detalhes tecnicos

### Ficheiro: `src/components/inbox/AIMessageComposer.tsx`

- Na funcao `handleSuggestReply` (linha 99), adicionar verificacao:
  - Se `messages.length === 0` ou ultima mensagem e `outbound`, mostrar toast e nao chamar AI
  - Alterar estado do botao "Sugerir resposta" para disabled quando ultima mensagem e outbound

### Ficheiro: `src/components/inbox/ConversationList.tsx`

- Linha 387-389: mudar `truncate` para `line-clamp-2`
- Adicionar prefixo "Voce: " quando a ultima mensagem for outbound
- Verificar se `last_message_direction` esta disponivel no tipo `Conversation` (se nao, verificar o hook `useConversations`)

### Ficheiro: `src/hooks/useConversations.ts` (se necessario)

- Verificar se o campo `last_message_direction` e retornado pela view/query
- Se nao existir, adicionar ao select ou calcular a partir da `last_message_preview`

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/components/inbox/AIMessageComposer.tsx` | Bloquear sugestao AI quando ultima mensagem e outbound |
| `src/components/inbox/ConversationList.tsx` | Preview em 2 linhas com prefixo de direcao |
| `src/hooks/useConversations.ts` | Adicionar `last_message_direction` se nao existir |

## Resultado esperado

- O AI so sugere respostas quando ha uma mensagem do cliente para responder
- A lista de conversas mostra previews mais completos (2 linhas) com indicacao de quem enviou
- O utilizador percebe rapidamente quais conversas aguardam resposta do cliente vs quais tem mensagens novas do cliente
