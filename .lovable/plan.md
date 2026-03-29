
# Filtro por tipo de nota no painel de notas

## Alteração

### `EbookEditorNotesPanel.tsx`

Adicionar um filtro por `note_type` abaixo dos botões "Capítulo actual" / "Todas":

- Novo estado `typeFilter: "all" | "note" | "highlight"` (default `"all"`)
- Renderizar 3 botões/tabs compactos: **Todas** · **Notas** · **Destaques** (com ícones `StickyNote` e `Highlighter`)
- Aplicar o filtro adicional ao array `filteredNotes`:
  - `"all"` → sem filtro de tipo
  - `"note"` → `note_type === "note"`
  - `"highlight"` → `note_type === "highlight"`
- Mostrar contagem junto de cada opção (ex: "Notas (3)")
- Ajustar mensagem de estado vazio para reflectir o filtro activo

| Ficheiro | Acção |
|---|---|
| `EbookEditorNotesPanel.tsx` | Adicionar estado `typeFilter`, botões de filtro e lógica de filtragem |

## Critérios de aceitação
- Filtro por tipo visível e funcional
- Combina com o filtro "Capítulo actual" / "Todas"
- Contagem de notas por tipo actualizada em tempo real
- Estado vazio contextual
