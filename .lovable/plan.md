

# Edição inline de notas no painel do editor

## Alterações

### 1. `EbookEditorNotesPanel.tsx`
- Adicionar estado `editingId` e `editingText` para controlar qual nota está em modo de edição
- Adicionar botão `Pencil` ao lado do `Trash2` no cabeçalho de cada nota
- Quando em edição: substituir o `<p>` do texto por um `<Textarea>` pré-preenchido com o conteúdo actual
- Botões "Guardar" (Check) e "Cancelar" (X) abaixo do textarea
- Guardar com Ctrl/Cmd+Enter
- Aceitar nova prop `updateNote` (já existe no hook `useEbookNotes`)

### 2. `EbookEditorNotesPanel.tsx` (interface)
- Adicionar `updateNote` à interface de props (tipo `UseMutationResult<void, Error, { noteId: string; noteText: string }>`)

### 3. Componente pai que passa as props
- Localizar onde `EbookEditorNotesPanel` é usado e passar `updateNote` do hook

| Ficheiro | Acção |
|---|---|
| `EbookEditorNotesPanel.tsx` | Adicionar estado de edição, textarea inline, botões guardar/cancelar, prop updateNote |
| Componente pai (onde o painel é montado) | Passar `updateNote` do hook |

## Critérios de aceitação
- Clicar no ícone de lápis activa edição inline com textarea
- Texto original pré-preenchido no textarea
- Guardar com botão ou Ctrl+Enter, cancelar com botão ou Escape
- Após guardar, nota actualizada imediatamente na lista
- Não é possível editar duas notas ao mesmo tempo

