

# Cursor de Mão Animada no Flipbook Reader

## Contexto

O utilizador pretende substituir o cursor padrão do rato por um cursor de mão animada sobre as páginas do flipbook, criando uma experiência mais interactiva e intuitiva de "folhear".

## Implementação

### 1. Cursores SVG customizados

Criar dois cursores SVG inline (via CSS `url("data:image/svg+xml,...")`) no `FlipbookReader.tsx`:
- **Mão aberta** (cursor padrão sobre as páginas) — estilo "grab"
- **Mão a agarrar** (quando clica/arrasta) — estilo "grabbing"

Usar a propriedade CSS `cursor` com SVG inline para evitar ficheiros externos.

### 2. Aplicação no container das páginas

No wrapper do `PageFlipBook` (div `.relative.flex.gap-1` na linha ~331), adicionar:
- `cursor: grab` no estado normal
- `cursor: grabbing` no estado `:active` (quando o utilizador clica/arrasta para virar página)

Opcionalmente, adicionar uma transição CSS suave para simular a animação da mão.

### 3. Classe CSS com animação

Adicionar ao `index.css` ou inline:
- Animação subtil de "pulso" ou "aceno" da mão no hover (usando keyframes CSS que alternam entre dois SVGs via `cursor` property — limitado) **ou** um overlay de mão animado via `pointer-events: none` que segue o cursor.

**Abordagem mais robusta**: Criar um componente `AnimatedHandCursor` que renderiza uma mão SVG animada que segue a posição do rato via `onMouseMove`, com `pointer-events: none` e `position: fixed`. Isto permite animação real (rotação, escala, bounce) impossível com `cursor` CSS puro.

### Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/AnimatedHandCursor.tsx` | Novo — componente de mão animada que segue o cursor |
| `src/components/ebooks/FlipbookReader.tsx` | Integrar cursor animado no container do flipbook, esconder cursor padrão |

### Critérios de Aceitação

- Cursor padrão escondido sobre as páginas do flipbook
- Mão animada visível e segue o rato suavemente
- Ao clicar: mão muda para estado "agarrar" (grabbing)
- Não interfere com a navegação, botões da toolbar ou outros elementos interactivos
- Funciona em fullscreen
- Mobile não é afectado (touch não tem cursor)

