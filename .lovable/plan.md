

# Fix: Markdown não renderiza no modo visual do editor de eBooks

## Diagnóstico
A função `markdownToHtml()` em `EbookRichEditor.tsx` (linhas 20-45) é um parser regex simplificado que **não suporta**:
- Listas não-ordenadas (`* item`, `- item`)
- Listas ordenadas (`1. item`)
- Listas aninhadas com bold (`* **Custódia:**`)
- Tabelas GFM
- Blocos de código com ``` fences

O projecto já tem `react-markdown` (v10.1.0) instalado. No entanto, como o editor usa `contentEditable` (não é read-only), não podemos simplesmente substituir por `<ReactMarkdown>` — precisamos converter markdown → HTML de forma completa antes de injectar no `contentEditable`.

## Alterações

### 1. Melhorar `markdownToHtml()` em `EbookRichEditor.tsx`
Substituir o parser regex limitado por uma conversão completa que suporte:
- **Listas não-ordenadas** (`* item`, `- item`) → `<ul><li>...</li></ul>`
- **Listas ordenadas** (`1. item`) → `<ol><li>...</li></ol>`
- **Bold dentro de listas** (`* **Texto:**`) → preservado correctamente
- **Blocos de código** (``` fences) → `<pre><code>...</code></pre>`
- **Tabelas** (pipes GFM) → `<table><tr><td>...</td></tr></table>`

A abordagem: processar o markdown por blocos/linhas, agrupando linhas consecutivas de lista em `<ul>/<ol>`, mantendo os regex existentes para headings, bold, italic, links e imagens.

### 2. Garantir migração transparente
- A função já detecta HTML existente (linha 22: `if (md.includes('<p>'))`) e faz bypass — isto mantém-se
- Conteúdo misto (parte markdown, parte HTML) continua a funcionar
- Não altera como o conteúdo é guardado na base de dados

### Ficheiros
| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/EbookRichEditor.tsx` | Reescrever `markdownToHtml()` com suporte completo a listas, tabelas e code blocks |

### Resultado esperado
- Capítulos com markdown (headings, listas, bold, links, HR) renderizam correctamente no modo visual
- O editor `contentEditable` continua editável normalmente
- Conteúdo já em HTML não é afectado

