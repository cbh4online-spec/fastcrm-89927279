

# Redesign da lista de conversas ao estilo Instagram DMs

## Objetivo

Simplificar a lista de conversas para seguir o estilo visual do Instagram Direct Messages, com layout limpo e claro onde se identifica facilmente a mensagem mais recente e quem a enviou.

## Alteracoes visuais

### Layout de cada item da conversa

Estilo atual: avatar + nome + canal + preview (2 linhas) + badges de prioridade + valor + unread count

Estilo novo (Instagram-like):
- Avatar (40px) a esquerda
- Nome em bold no topo, preview numa unica linha abaixo
- Preview com prefixo "Tu: " para mensagens outbound
- Tempo relativo alinhado a direita do preview (ex: "3 h", "17 h")
- Indicador de nao lida: ponto azul a direita (em vez de badge com numero)
- Nome em bold quando ha mensagens nao lidas
- Icone de canal pequeno junto ao nome (manter para distinguir canais)
- Remover badges de prioridade, valor estimado e SLA da lista (manter no painel de contexto)

### Estrutura visual de cada item

```text
+-------------------------------------------+
| [Avatar]  Nome do Contacto  [canal]       |
|           Tu: Ultima mensagem...  · 3 h  ●|
+-------------------------------------------+
```

Quando nao lida:
- Nome em **bold** (font-semibold)
- Preview em texto mais escuro
- Ponto azul (w-2 h-2 rounded-full bg-blue-500) a direita

Quando lida:
- Nome em peso normal (font-normal)
- Preview em text-muted-foreground
- Sem ponto

## Detalhes tecnicos

### Ficheiro: `src/components/inbox/ConversationList.tsx`

1. **Simplificar o bloco de cada conversa** (linhas 336-414):
   - Remover a linha de badges (priority, value, unread count badge)
   - Preview numa unica linha com `truncate` (nao `line-clamp-2`)
   - Mover o tempo para a mesma linha do preview, separado por " · "
   - Substituir o badge de unread por um ponto azul simples
   - Aplicar `font-semibold` ao nome quando `unread_count > 0`

2. **Aumentar ligeiramente o avatar** de `h-9 w-9` para `h-10 w-10`

3. **Simplificar o layout da linha do nome**:
   - Nome + icone de canal na primeira linha
   - Preview + tempo + ponto azul na segunda linha

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/components/inbox/ConversationList.tsx` | Redesign dos itens da lista ao estilo Instagram DMs |

## Resultado esperado

- Lista de conversas limpa e facil de ler
- Identificacao imediata de mensagens nao lidas (ponto azul + nome bold)
- Preview claro com indicacao de quem enviou ("Tu: ...")
- Tempo relativo visivel junto ao preview
- Menos ruido visual, foco na informacao essencial

