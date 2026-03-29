

# Lupa de Zoom para o Flipbook

## Diagnóstico

O flipbook já tem zoom global (escala o livro inteiro via `transform: scale()`), mas não tem uma lupa localizada que amplie apenas a zona onde o cursor está — semelhante ao `StoreImageZoom` da loja. O pedido é adicionar um modo "lupa" que, quando activado, mostra uma janela de zoom flutuante seguindo o cursor sobre a página do eBook.

## Abordagem

Reutilizar o padrão do `StoreImageZoom`: quando o modo lupa está activo, capturar a posição do rato sobre o container do livro e renderizar um "lens overlay" que mostra uma cópia ampliada dessa zona.

## Alterações

### 1. Novo componente `FlipbookZoomLens.tsx`

- Props: `containerRef`, `active`, `zoomFactor` (default 2.5)
- Lógica:
  - `onMouseMove` no container: calcular posição relativa (%)
  - Renderizar um círculo/quadrado flutuante (200×200px) que segue o cursor
  - Dentro da lupa: clonar o conteúdo visível do container via CSS `background` + `background-position` calculado, ou usar `transform: scale()` + `clip-path` numa cópia do container
  - Técnica escolhida: capturar o `bookContainerRef` e renderizar um overlay com `overflow: hidden`, contendo uma cópia escalada do container posicionada inversamente ao cursor
- Esconder quando o cursor sai do container

### 2. Toolbar — Botão Lupa (`FlipbookToolbar.tsx`)

- Adicionar novo botão com ícone `Search` (lupa) ao lado dos botões de zoom existentes
- Props novas: `magnifyMode`, `onToggleMagnify`
- Visual: botão activo com destaque (como o highlightMode)

### 3. `FlipbookReader.tsx`

- Novo state `magnifyMode` (boolean)
- Toggle via toolbar
- Montar `FlipbookZoomLens` sobre o `bookContainerRef` quando `magnifyMode === true`
- Desactivar cursor personalizado (AnimatedHandCursor) quando magnifyMode activo
- Mutuamente exclusivo com `highlightMode` (activar um desactiva o outro)

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/FlipbookZoomLens.tsx` | **Novo** — componente da lupa flutuante |
| `src/components/ebooks/FlipbookReader.tsx` | State + integração da lupa |
| `src/components/ebooks/FlipbookToolbar.tsx` | Botão toggle da lupa |

## Critérios de aceitação

- Botão "Lupa" visível na toolbar do flipbook
- Ao activar, mover o cursor sobre a página mostra um zoom local ~2.5x
- A lupa segue o cursor em tempo real sem lag perceptível
- Ao sair da área do livro, a lupa desaparece
- Mutuamente exclusivo com modo sublinhado
- Funciona em desktop (esconder em mobile, onde não há hover)

