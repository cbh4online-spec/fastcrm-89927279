

# Fix: Blocos do editor eBook + Botão Undo

## Problemas identificados

1. **Inserção de blocos falha** — quando o editor não tem foco/cursor ativo, o `insertBlock` tenta `editor.focus()` mas o cursor não fica posicionado, resultando em inserção inconsistente. A imagem inserida mostra `src=""` (broken image).
2. **Sem botão Undo** — não existe forma de desfazer ações no editor.
3. **Erro de consola** — `EbookInlineToolbar` usa `Popover` que tenta passar ref a um function component sem `forwardRef`.

## Correções

### 1. `EbookRichEditor.tsx` — Corrigir `insertBlock` + adicionar Undo/Redo

- No `insertBlock`, quando não há cursor: fazer `editor.focus()` e depois usar `Range` para posicionar no final antes de inserir (garantir que funciona sempre).
- Adicionar suporte a **Ctrl+Z / Ctrl+Y** (já nativo do `contentEditable`, mas expor botões).
- Expor `undo()` e `redo()` via `useImperativeHandle`.
- Para o bloco "Imagem" com `src=""`: ao detetar inserção de `<img src="">`, abrir automaticamente um prompt para URL ou file picker (ou simplesmente inserir placeholder visível em vez de imagem quebrada).

### 2. `EbookBlockToolbar.tsx` — Melhorar blocos

- Mudar o bloco "Imagem" para inserir um placeholder visual editável (div com ícone de imagem e texto "Clique para adicionar imagem") em vez de `<img src="">`.
- Adicionar botão **Undo** e **Redo** no topo da toolbar.

### 3. `EbookEditor.tsx` — Adicionar botão Undo no header do capítulo

- Adicionar botões Undo/Redo na barra de ferramentas do capítulo (junto ao título), chamando `document.execCommand('undo')` e `document.execCommand('redo')`.

### 4. `EbookInlineToolbar.tsx` — Fix ref warning

- O `Popover` tenta dar ref ao `Button` que já é um component. Não é um bug funcional mas gera warnings. Corrigir usando `forwardRef` pattern correto nos sub-componentes.

## Ficheiros editados

| Ficheiro | Alteração |
|----------|-----------|
| `EbookRichEditor.tsx` | Fix insertBlock fallback (posicionar cursor no final), expor undo/redo via ref, Ctrl+Z/Y já funciona nativamente |
| `EbookBlockToolbar.tsx` | Mudar bloco Imagem para placeholder visual, adicionar secção Undo/Redo no topo |
| `EbookEditor.tsx` | Botões Undo/Redo na toolbar do capítulo |
| `EbookInlineToolbar.tsx` | Silenciar warning de ref |

