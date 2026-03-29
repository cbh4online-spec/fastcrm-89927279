

# Fix: Editor Gamma-style — Problemas de funcionalidade

## Problemas identificados

1. **Inserção de blocos não funciona bem** — `document.execCommand('insertHTML')` é unreliável e pode inserir no sítio errado ou não inserir de todo quando o editor não tem foco/cursor
2. **Drag & Drop incompleto** — `dragOverIndex` nunca é atualizado (o handler `onDragOver` só faz `e.preventDefault()` sem chamar `setDragOverIndex`), por isso o feedback visual não aparece
3. **Sincronização contentEditable ↔ React** — a cada mudança externa do `value`, o `useEffect` reescreve `innerHTML`, causando saltos de cursor durante edição
4. **Toolbar inline pode aparecer fora de posição** — o cálculo de `top` pode ficar negativo e a toolbar fica cortada

---

## Correções

### 1. `EbookRichEditor.tsx` — Inserção de blocos fiável

Adicionar método `insertBlock(html)` exposto via `ref` (ou callback):
- Se existe cursor/seleção dentro do editor → inserir nessa posição via `Range.insertNode`
- Se não → append ao final do editor
- Atualizar estado React após inserção

Corrigir sync do `useEffect`:
- Só atualizar `innerHTML` quando o editor **não tem foco** (evita saltos de cursor)
- Usar `useRef` para guardar o último valor enviado e comparar

### 2. `EbookEditor.tsx` — Corrigir `insertBlock`

Mudar de `document.execCommand('insertHTML')` para chamar o novo método do `EbookRichEditor`:
- Passar `editorRef` ao `EbookRichEditor` via `forwardRef`
- Ou passar um callback `onInsertBlock` que o editor expõe

### 3. `ChapterThumbnail.tsx` / `EbookEditor.tsx` — Drag & Drop completo

- No `handleDragOver`, chamar `setDragOverIndex(targetIndex)` para mostrar feedback visual
- Adicionar `onDragLeave` para limpar `dragOverIndex`
- Adicionar `onDragEnd` para reset do estado

### 4. `EbookInlineToolbar.tsx` — Posicionamento seguro

- Clamp `top` para nunca ser negativo (mínimo 8px)
- Clamp `left` para ficar dentro dos limites do editor

---

## Ficheiros editados

| Ficheiro | Alteração |
|----------|-----------|
| `EbookRichEditor.tsx` | Expor `insertBlock` via callback, corrigir sync `innerHTML` para não reescrever durante edição |
| `EbookEditor.tsx` | Usar novo callback de inserção, corrigir drag handlers (`setDragOverIndex`, `onDragLeave`, `onDragEnd`) |
| `EbookInlineToolbar.tsx` | Clamp posição para ficar dentro do viewport do editor |

