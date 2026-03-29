

# Fix: Formatação do Editor e Páginas do eBook

## Diagnóstico

Analisei os ficheiros `EbookEditor.tsx`, `EbookRichEditor.tsx`, `FlipbookPage.tsx` e `FlipbookReader.tsx`. Identifico 4 problemas concretos:

### 1. Editor com `bg-white` hardcoded (EbookEditor.tsx:600)
O container do editor WYSIWYG tem `bg-white` fixo — quebra dark mode e não reflecte o template.

### 2. HTML content sem estilos no FlipbookPage
O ramo HTML (`dangerouslySetInnerHTML`) usa `contentInlineStyles` que apenas define `lineHeight: 1.75`. Os `h1`, `h2`, `blockquote`, `strong`, `hr`, `code` ficam sem qualquer formatação — ao contrário do ramo Markdown que tem componentes estilizados. Como o editor grava HTML, o conteúdo gerado perde todo o estilo visual no flipbook.

### 3. Editor não mostra estilos do template
O `EbookRichEditor` não recebe CSS variables do template — o utilizador edita sem ver fontes, cores ou espaçamentos do tema escolhido.

### 4. Thumbnails com cor hardcoded amber
No `FlipbookReader.tsx:297`, os thumbnails usam `border-amber-400` fixo em vez do accent do template.

## Plano de Correção

### Ficheiro 1: `FlipbookPage.tsx` — CSS para conteúdo HTML
Expandir `contentInlineStyles` com regras CSS que espelhem os componentes Markdown: headings com `--ebook-primary` e `--ebook-heading-font`, blockquotes com accent gradient, hr estilizado, strong com cor primária, code com background accent. Usar uma `<style>` scoped ou inline styles abrangentes no container HTML.

### Ficheiro 2: `EbookEditor.tsx` — Remover bg-white, injetar CSS vars
- Linha 600: substituir `bg-white` por `bg-card` (dark-mode safe)
- Injetar CSS variables do `ebook.global_styles` no container do editor para que o rich editor as herde

### Ficheiro 3: `EbookRichEditor.tsx` — Herdar estilos do template
- Aplicar `fontFamily: var(--ebook-body-font)` ao contentEditable
- Headings no prose herdam `--ebook-heading-font`
- Manter fallbacks para eBooks sem template

### Ficheiro 4: `FlipbookReader.tsx` — Thumbnail accent
- Substituir `border-amber-400` por estilo inline com `var(--ebook-accent)`

## Ficheiros a Modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/FlipbookPage.tsx` | Estilos CSS completos para conteúdo HTML |
| `src/components/ebooks/EbookEditor.tsx` | Dark-mode safe + CSS vars do template |
| `src/components/ebooks/EbookRichEditor.tsx` | Herdar fontes/cores do template |
| `src/components/ebooks/FlipbookReader.tsx` | Thumbnail accent dinâmico |

## Resultado Esperado
- Editor mostra visualmente as fontes e cores do template escolhido
- Conteúdo HTML renderizado no flipbook fica identico ao Markdown (headings, quotes, dividers estilizados)
- Dark mode funcional no editor
- Zero breaking changes

