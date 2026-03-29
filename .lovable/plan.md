

# Fix: Menus dentro dos limites do ecrã

## Problema
Os menus e toolbars (inline toolbar, popovers, dropdown menus) podem aparecer fora dos limites visíveis do ecrã, cortados ou inacessíveis.

## Correções

### 1. `EbookInlineToolbar.tsx` — Clamping completo
- Usar `useRef` + `useEffect` para medir a largura real da toolbar após render
- Clampar `left` para que a toolbar nunca ultrapasse os limites do container pai (considerando o `translateX(-50%)`)
- Clampar `top` para nunca ficar negativo (já tem `Math.max(8, ...)` mas precisa considerar a altura da toolbar)
- Adicionar `collisionPadding` nos `PopoverContent` de cor e link para evitar que saiam do viewport

### 2. `EbookRichEditor.tsx` — Melhorar cálculo de posição da toolbar
- No `handleSelectionChange`, clampar `left` entre metade da largura da toolbar e `editorWidth - metade da largura`
- Garantir que `top` nunca fica negativo mesmo com seleções no topo do editor
- Adicionar `overflow: visible` ou container com `position: relative` adequado

### 3. `BlockActionMenu.tsx` — Collision boundary
- Adicionar `collisionPadding={8}` ao `DropdownMenuContent` para o Radix auto-posicionar dentro do viewport

### 4. `EbookBlockToolbar.tsx` — Sem alterações necessárias (sidebar fixa)

## Ficheiros editados

| Ficheiro | Alteração |
|----------|-----------|
| `EbookInlineToolbar.tsx` | Medir toolbar com ref, clampar posição, adicionar `collisionPadding` nos popovers |
| `EbookRichEditor.tsx` | Melhorar cálculo de posição no `handleSelectionChange` com limites do editor |
| `BlockActionMenu.tsx` | Adicionar `collisionPadding` ao dropdown |

