

# Eliminar highlights ao clicar num highlight existente

## Diagnóstico

Os highlights são renderizados como `<mark>` no HTML via `applyHighlightsToHtml`, mas não têm handler de clique. Não existe forma de eliminar um highlight individual directamente na página — apenas via painel de notas lateral.

## Plano

### 1. Adicionar `data-highlight-id` aos `<mark>` gerados

Em `FlipbookPage.tsx`, alterar `applyHighlightsToHtml` e `applyHighlightsToText` para aceitar o `noteId` em cada `HighlightMark` e inserir `data-highlight-id="{id}"` no `<mark>`. Também adicionar `cursor:pointer` ao estilo inline.

Actualizar `HighlightMark` para incluir `id?: string`.

### 2. Construir `highlightsMap` com `id` do note

Em `FlipbookReader.tsx`, ao construir o `highlightsMap`, incluir o `note.id` em cada entrada para que o `<mark>` saiba que nota eliminar.

### 3. Adicionar handler de clique nos `<mark>` (FlipbookPage)

No `onClick` do `ebook-html-content` div (já existente para links), detectar cliques em `<mark class="highlight-mark">`:
- Extrair `data-highlight-id`
- Chamar novo callback `onHighlightClick(highlightId, rect)` passado via props

### 4. Criar mini-popover de confirmação de eliminação

Novo componente inline ou reutilizar padrão existente — popover compacto posicionado junto ao highlight clicado com:
- Texto do highlight (preview)
- Nota associada (se existir)
- Botão "Eliminar" (vermelho)
- Botão "Cancelar"

### 5. Propagar o callback até ao FlipbookReader

- `FlipbookPage` recebe `onHighlightClick?: (id: string, position: {x:number,y:number}) => void`
- `PageWrapper` no `PageFlip.tsx` propaga esta prop
- `FlipbookReader` mostra o popover de confirmação e chama `deleteNote.mutate(id)` ao confirmar

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/FlipbookPage.tsx` | Adicionar `id` ao `HighlightMark`, `data-highlight-id` nos `<mark>`, callback `onHighlightClick` |
| `src/components/ebooks/FlipbookReader.tsx` | Incluir `id` no `highlightsMap`, handler + popover de eliminação |
| `src/components/ebooks/PageFlip.tsx` | Propagar `onHighlightClick` via `PageWrapper` |

