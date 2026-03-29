

# Remover linhas e criar páginas mais gráficas

## Problema

As páginas de conteúdo têm linhas/bordas visíveis (header border-bottom, footer border-top, h2 border-left) que criam um aspecto muito "documento". O layout é demasiado textual sem elementos visuais de quebra.

## Alterações

### 1. `FlipbookPage.tsx` — Remover linhas e adicionar elementos gráficos

**Remover:**
- `border-b border-amber-900/8` do header
- `border-t border-amber-900/8` do footer
- `prose-h2:border-l-2 prose-h2:border-amber-600/30 prose-h2:pl-[0.6em]` dos headings

**Adicionar elementos visuais:**
- Decoração subtil no header (pequeno ornamento em vez de linha)
- Headings (h2/h3) com fundo decorativo suave (gradient ou accent background) em vez de border-left
- Pull-quote styling melhorado para blockquotes (aspas decorativas grandes, fundo com gradiente)
- Capitular (drop cap) do primeiro parágrafo já existe — manter
- Separadores decorativos entre secções (ornamento tipográfico `✦` ou `❧`) em vez de linhas
- Fundo subtil com pattern decorativo (canto da página com detalhe ornamental via CSS)

**Componentes customizados do ReactMarkdown:**
- `h2`: fundo amber/warm com cantos arredondados, ícone decorativo
- `h3`: estilo accent com linha superior curta decorativa
- `blockquote`: aspas grandes decorativas, fundo gradient
- `hr`: ornamento tipográfico central em vez de linha

### 2. `FlipbookPage.tsx` — Decoração de página

- Adicionar um elemento decorativo no canto superior direito (ornamento sutil em CSS/SVG)
- Footer sem borda, apenas número com ornamento fino

### Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `FlipbookPage.tsx` | Remover bordas, adicionar decorações gráficas nos headings, blockquotes, separadores e cantos da página |

