

# Fix: Formatação do eBook — Paginação, Imagens, Fontes e Links

## Diagnóstico

A partir do screenshot e da análise do código, identifico estes problemas:

1. **Texto cortado/aglomerado nas páginas** — O `CHARS_PER_PAGE = 1200` é demasiado elevado para páginas com `px-[2.5em] py-[2em]`, causando overflow. As páginas ficam com texto a mais para o espaço disponível.
2. **Imagens só existem como cover de capítulo** — O tipo `FlipbookPageData` para "content" não suporta imagens inline no flipbook. O HTML com `<img>` é renderizado mas as imagens ficam comprimidas (`max-height: 12em`) sem lógica de paginação adequada.
3. **Fontes não customizáveis pelo utilizador** — O `EbookThemeSelector` só tem 6 temas fixos sem opção de alterar fonte/tipo de letra. Não há selector de fonte no editor.
4. **Links não clicáveis no flipbook** — Os links (`<a>`) no conteúdo HTML são renderizados mas não são interativos (o flipbook captura os cliques para virar página).

## Plano de Correção

### 1. Reduzir `CHARS_PER_PAGE` e melhorar paginação (`FlipbookReader.tsx`)
- Reduzir `CHARS_PER_PAGE` de 1200 para **800** caracteres para evitar overflow com as margens maiores
- Aumentar `IMAGE_CHAR_EQUIVALENT` de 400 para **600** (imagens ocupam mais espaço visual)
- Na `splitHtmlIntoPages`, reduzir o buffer de 20% para 10% (`CHARS_PER_PAGE * 1.1`)

### 2. Suportar imagens inline no flipbook (`FlipbookPage.tsx`)
- Remover `max-height: 12em` nas imagens — usar `max-height: 45%` para ocupar até metade da página
- Melhorar o CSS de imagens no `htmlContentScopedCSS` para permitir imagens maiores e com caption
- Adicionar suporte a `<figure>` com `<figcaption>` no CSS scoped

### 3. Tornar links clicáveis no flipbook (`FlipbookPage.tsx`)
- Adicionar `onClick` handler no container de conteúdo que intercepta cliques em `<a>` e abre em nova tab via `window.open`
- Estilizar links com `cursor: pointer` e `text-decoration: underline` no CSS scoped
- No markdown renderer, renderizar links como `<a>` com `target="_blank"` e `rel="noopener"`

### 4. Selector de fonte no editor (`EbookEditor.tsx`)
- Adicionar um dropdown de fontes na barra lateral direita (junto ao branding) com opções: Georgia, Merriweather, Lora, Inter, Open Sans, Playfair Display
- Ao seleccionar, actualizar `global_styles.headingFont` e `global_styles.bodyFont` no eBook
- Carregar Google Fonts dinamicamente via `<link>` no `<head>`

### 5. Adicionar bloco de link na toolbar (`EbookBlockToolbar.tsx`)
- Adicionar botão "Link/Botão" que insere um bloco `<a>` estilizado como botão CTA
- O utilizador pode editar o texto e URL inline

## Ficheiros a Modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/FlipbookReader.tsx` | Reduzir CHARS_PER_PAGE, ajustar paginação |
| `src/components/ebooks/FlipbookPage.tsx` | Imagens maiores, links clicáveis, CSS melhorado |
| `src/components/ebooks/EbookEditor.tsx` | Selector de fonte na sidebar |
| `src/components/ebooks/EbookBlockToolbar.tsx` | Bloco de link/CTA |

## Critérios de Aceitação
- Páginas não têm texto cortado nem overflow
- Imagens inline ocupam espaço proporcional na página
- Links são clicáveis e abrem em nova tab
- Utilizador pode escolher fonte do eBook no editor
- Alterações de fonte reflectem-se no preview e no flipbook

