

# Melhorar indicador visual dos highlights com animação e tooltip

## Alterações

### 1. Adicionar `note` ao `HighlightMark` (`FlipbookPage.tsx`)
- Estender interface: `note?: string`
- Nas funções `applyHighlightsToHtml` e `applyHighlightsToText`:
  - Adicionar `title` dinâmico: se `hl.note` existe, mostrar a nota; senão, "Sublinhado"
  - Adicionar classe CSS `highlight-mark` ao `<mark>` para animação
  - Adicionar `data-note` attribute para acessibilidade

### 2. Propagar nota no `highlightsMap` (`FlipbookReader.tsx`)
- Incluir `note: note.content || ""` no objecto pushed para o mapa (linha 259)

### 3. Animação CSS (`index.css` ou inline)
- Adicionar keyframe `highlight-fade-in` (opacidade 0→1 + ligeiro scale)
- Estilo `.highlight-mark`: `animation: highlight-fade-in 0.4s ease-out`
- Cursor pointer no hover quando há nota, com transição de opacidade no background

### 4. Tooltip nativo melhorado
- Usar atributo `title` com o texto da nota — funciona em todos os browsers sem dependências extra
- Alternativa: se quisermos tooltip styled, wrapping o `<mark>` num `<span>` com CSS `::after` pseudo-element (leve, sem JS extra)

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `FlipbookPage.tsx` | Estender `HighlightMark`, actualizar funções de highlight com classe + title dinâmico |
| `FlipbookReader.tsx` | Passar `note` no `highlightsMap` |
| `src/index.css` | Adicionar keyframe `highlight-fade-in` e estilos `.highlight-mark` |

## Critérios de aceitação
- Highlights aparecem com animação fade-in suave ao carregar a página
- Tooltip mostra a nota associada ao passar o cursor (ou "Sublinhado" se sem nota)
- Animação não interfere com performance nem navegação do flipbook

