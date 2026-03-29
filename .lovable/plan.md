

# Corrigir texto invisível no FlipBook e garantir edição funcional

## Problema identificado

Existe uma **incompatibilidade de formato** entre o editor e o leitor:

1. **Editor** (`EbookRichEditor`): usa `contentEditable` e guarda o conteúdo como **HTML** (ex: `<p>Texto...</p><h2>Título</h2>`)
2. **Leitor** (`FlipbookPage`): renderiza o conteúdo com `ReactMarkdown`, que espera **Markdown**, não HTML
3. **Paginação** (`splitContentIntoPages`): divide o texto por `\n\n` — funciona para Markdown, mas HTML é normalmente uma string contínua sem quebras duplas

**Resultado**: O texto existe na base de dados mas não aparece no FlipBook porque o ReactMarkdown não sabe interpretar tags HTML, e a paginação falha porque não encontra `\n\n` no HTML.

## Solução

### 1. `FlipbookPage.tsx` — Renderizar HTML quando o conteúdo for HTML

- Detectar se o conteúdo é HTML (contém `<p>`, `<h1>`, `<div>`, etc.)
- Se for HTML: usar `dangerouslySetInnerHTML` com as mesmas classes de estilo
- Se for Markdown: manter o `ReactMarkdown` actual (retrocompatibilidade com conteúdos antigos)

### 2. `FlipbookReader.tsx` — Paginar HTML correctamente

Reescrever `splitContentIntoPages` para suportar HTML:
- Usar um parser simples que divide por tags de bloco (`<p>`, `<h1>`–`<h6>`, `<blockquote>`, `<hr>`, `<img>`, `<div>`, `<ul>`, `<ol>`, `<table>`, `<figure>`)
- Agrupar blocos até atingir o limite de caracteres por página
- Manter a lógica existente como fallback para Markdown

### 3. `EbookRichEditor.tsx` — Sem alteração

O editor já funciona correctamente — o problema está apenas na renderização do FlipBook.

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `FlipbookReader.tsx` | `splitContentIntoPages` com suporte a HTML |
| `FlipbookPage.tsx` | Renderização condicional: HTML ou Markdown |

