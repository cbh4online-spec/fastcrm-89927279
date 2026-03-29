

# Fix: Formatação e Estilo Visual do eBook Reader

## Diagnóstico

Analisando o eBook publicado e as imagens de referência, identifico os seguintes problemas:

### Problemas Actuais
1. **FlipbookPage ignora style tokens do template** — Cores hardcoded (`text-slate-800`, `bg-[#fefcf9]`, `text-amber-*`) em vez de usar as CSS variables (`--ebook-primary`, `--ebook-heading-font`, `--ebook-body-font`)
2. **Padding insuficiente** — `px-[1.2em] py-[1em]` é demasiado apertado para um layout editorial; as referências mostram margens generosas (40-60px)
3. **Tipografia pobre** — Tamanhos de fonte e line-height não escalam bem; headings (h2) sem hierarquia visual clara
4. **Header/Footer fraco** — O header usa cor fixa `text-amber-700/40` em vez da cor primária do template
5. **Ornamentos hardcoded** — Curvas SVG e símbolos (`✦`, `❧`) fixos em amber, sem variação por template
6. **Cover page não usa tokens** — Background fixo em slate-900, decoradores em amber-400
7. **TOC page** — Cores fixas em amber-700, não respeita template
8. **Chapter title page** — Mesmas cores fixas

### Referências Visuais
As imagens de referência mostram: margens amplas, tipografia serif elegante, hierarquia visual clara com cores do tema, separadores subtis, e formatação editorial profissional.

## Plano de Correção

### 1. `FlipbookPage.tsx` — Consumir CSS Variables em Todos os Tipos de Página

**Cover page:**
- Background: `var(--ebook-primary, #0f172a)` em vez de hardcoded
- Decoradores: `var(--ebook-accent, #d4a574)` em vez de `amber-400`
- Font: `var(--ebook-heading-font, serif)`

**TOC page:**
- Background: `var(--ebook-bg, #fefcf9)`
- Números e linhas: `var(--ebook-accent)` em vez de amber
- Títulos: `var(--ebook-primary)` ou foreground do template

**Chapter title page:**
- Labels e separadores: `var(--ebook-accent)` em vez de amber-700
- Título: `var(--ebook-primary)` com heading font do template

**Content pages (foco principal):**
- Background: `var(--ebook-bg, #fefcf9)`
- Texto body: cor derivada do template (contraste adequado)
- Headings: `var(--ebook-primary)` com heading font
- Header label: `var(--ebook-accent)` em vez de amber-700/40
- Footer: `var(--ebook-accent)` em vez de amber-700/30
- Ornamentos SVG: `var(--ebook-accent)` em vez de amber-800
- First-letter: `var(--ebook-accent)` em vez de amber-800
- Blockquotes: background derivado de `var(--ebook-accent)` com opacidade
- h2 decorador: usar accent color
- Separadores (hr): usar accent color

**Contact page:**
- Mesma lógica: primary, accent, heading font

### 2. Melhorar Padding e Espaçamento

- Content pages: `px-[2.5em] py-[2em]` (de `px-[1.2em] py-[1em]`)
- TOC: manter `px-[3em] py-[3em]` (adequado)
- Melhorar `line-height` do body para `1.75` (de `1.65`)
- Espaçamento entre paragrafos: `mb-[0.7em]` (de `0.5em`)

### 3. Melhorar Hierarquia Tipográfica

- h2 no conteúdo: separador visual mais forte, tamanho `1.3em`
- h3: `1.15em` com borda accent subtil
- Blockquotes: aspas maiores, padding mais generoso
- First-letter: manter mas usar accent color do template

## Ficheiros a Modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/FlipbookPage.tsx` | Substituir todas as cores hardcoded por CSS variables; melhorar padding/spacing/tipografia |

## Resultado Esperado
- Páginas respeitam o template escolhido (cores, fontes)
- Layout editorial profissional comparável às referências
- Fallback seguro para eBooks sem template (comportamento actual como default)
- Zero breaking changes

