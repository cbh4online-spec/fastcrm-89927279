

# Transformar eBook num Flipbook estilo Calaméo

## Conceito
Substituir o reader atual (scroll vertical simples) por um **flipbook interativo** com navegação por páginas, animação de virar página, e layout editorial rico — como o Calaméo.

## O que muda

### 1. Leitor público (`PublicEbookPage.tsx`) — Redesign total

**Layout flipbook:**
- Viewport centrado com aspecto de livro aberto (two-page spread em desktop, single page em mobile)
- Fundo escuro/cinza atrás do "livro" para destacar as páginas brancas
- Páginas com sombra realista e bordas subtis simulando papel
- Animação CSS de page-flip ao navegar (transform rotateY com perspective)

**Páginas do eBook:**
- **Capa**: full-bleed com imagem de capa ocupando a página inteira, título sobreposto com tipografia grande
- **Página de índice**: layout editorial com números de página e linhas pontilhadas
- **Páginas de capítulo**: conteúdo dividido automaticamente em "páginas" de altura fixa (~700px), com:
  - Imagem hero no topo quando o capítulo tem `cover_image`
  - Tipografia serif editorial (drop caps, pull quotes)
  - Número de página no rodapé
  - Cabeçalho com nome do capítulo em cada página

**Barra de controlo (toolbar inferior):**
- Setas esquerda/direita para navegar
- Número da página atual / total
- Botão fullscreen
- Thumbnails em miniatura (strip horizontal clicável)
- Botão de zoom

### 2. Paginação automática do conteúdo
- Dividir o conteúdo Markdown de cada capítulo em blocos que cabem numa "página" de altura fixa
- Cada bloco renderizado como uma página independente no flipbook
- Imagens inline ocupam página inteira ou meia página conforme tamanho

### 3. Componente `FlipbookReader`
Novo componente dedicado com:
- Estado de página atual (`currentPage`)
- Array de páginas gerado a partir dos capítulos (capa + índice + páginas de conteúdo)
- Navegação por teclado (← →), swipe touch, e clique nas margens
- Transição animada entre páginas (slide ou flip 3D)

### 4. Preview no editor
- O preview mode no `EbookEditor` também usa o novo componente flipbook (versão compacta)
- Mostra como o eBook ficará visualmente antes de publicar

## Detalhes técnicos

**Ficheiros alterados:**
- `PublicEbookPage.tsx` — rewrite completo com flipbook
- Novo: `src/components/ebooks/FlipbookReader.tsx` — componente core do flipbook
- Novo: `src/components/ebooks/FlipbookPage.tsx` — renderização de cada página
- Novo: `src/components/ebooks/FlipbookToolbar.tsx` — controles de navegação
- `EbookEditor.tsx` — integrar preview flipbook

**Paginação:**
- Usa `useRef` + DOM measurement para calcular quantos parágrafos cabem por página
- Fallback: divisão por contagem de caracteres (~2000 chars por página)
- Imagens de capítulo = página dedicada full-bleed

**Animação:**
- CSS `transform: rotateY()` com `perspective(1200px)` para efeito de virar página
- `transition-duration: 0.6s` com `ease-in-out`
- Fallback simples (slide horizontal) para dispositivos com pouca performance

**Navegação:**
- Keyboard: ArrowLeft/ArrowRight
- Touch: swipe horizontal (threshold 50px)
- Click: margem esquerda/direita da página
- Thumbnails: click direto para qualquer página

