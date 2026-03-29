

# Fix: Índice navega para página anterior

## Problema

O handler do TOC faz `onGoToPage(ch.pageStart - 1)` mas com `showCover: true` no react-pageflip, a numeração de spreads fica desalinhada — o utilizador aterra na página anterior à pretendida.

## Correcção

**Ficheiro:** `src/components/ebooks/FlipbookPage.tsx` (linha 108)

Alterar de:
```ts
onGoToPage?.(ch.pageStart - 1);
```
Para:
```ts
onGoToPage?.(ch.pageStart);
```

## Critérios de Aceitação
- Clicar num capítulo no índice navega exactamente para a página de título desse capítulo
- Funciona em modo spread (desktop) e portrait (mobile)

