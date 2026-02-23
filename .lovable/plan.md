

# Corrigir ordenacao e visibilidade do tempo nas conversas

## Problema 1: Conversas nao ordenadas pela mais recente

Atualmente, a lista ordena primeiro por `conversation_priority_score` (pontuacao de prioridade) e so depois por `last_message_at`. Isto significa que conversas com pontuacao alta ficam no topo mesmo que tenham mensagens antigas, e conversas com mensagens recentes ficam abaixo.

### Solucao

Alterar a ordenacao para usar apenas `last_message_at` descendente (mais recente primeiro), removendo a ordenacao por priority score.

## Problema 2: Tempo da mensagem nao visivel

O tempo relativo (ex: "3 h", "17 h") esta na mesma linha do preview da mensagem e e cortado quando o preview e longo. Precisa de ter mais destaque visual.

### Solucao

Mover o tempo relativo para a linha do nome (primeira linha), alinhado a direita, como no estilo Instagram DMs. Isto garante que o tempo e sempre visivel independentemente do tamanho do preview.

## Detalhes tecnicos

### Ficheiro: `src/components/inbox/ConversationList.tsx`

**Ordenacao (linhas 190-199):** Substituir a ordenacao dupla por ordenacao simples por data:

```
filtered.sort((a, b) => {
  const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
  const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
  return dateB - dateA;
});
```

**Layout do item (linhas 360-390):** Mover o tempo para a primeira linha (junto ao nome), alinhado a direita:

```text
Linha 1: [Nome]  [canal-icon]  ............  [3 h]
Linha 2: [Tu: preview da mensagem...]              [●]
```

- Remover o tempo da segunda linha (junto ao preview)
- Adicionar o tempo como `<span>` a direita na primeira linha, com `ml-auto`
- Usar `text-[11px] text-muted-foreground` para o tempo

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/components/inbox/ConversationList.tsx` | Ordenar apenas por data; mover tempo para linha do nome |

