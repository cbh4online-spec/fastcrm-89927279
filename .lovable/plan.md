

# Drag-and-Drop para Mover Ficheiros entre Pastas

## Alterações

### `src/components/entity/EntityDocumentsSection.tsx`

1. **Adicionar mutação `moveToFolder`** no hook `useEntityDocuments` — faz `UPDATE` do campo `folder` de um documento por ID

2. **Tornar `DocumentRow` arrastável** — adicionar `draggable`, `onDragStart` (guarda `doc.id` em `dataTransfer`), visual de opacidade reduzida ao arrastar

3. **Tornar `FolderGroup` um drop target** — adicionar `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` no header da pasta. Ao largar, chama `moveToFolder(docId, folderName)`. Indicador visual (ring azul) quando hover com drag

4. **Adicionar zona de drop "Raiz"** — uma área no fundo da lista ou acima dos ficheiros raiz que aceita drop para mover ficheiros para `folder = null` (remover de pasta)

5. **Feedback visual**: documento arrastado fica com `opacity-40`, pasta alvo fica com `ring-2 ring-primary`

### Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/components/entity/EntityDocumentsSection.tsx` | Adicionar mutação `moveToFolder`, drag no `DocumentRow`, drop no `FolderGroup` e zona raiz |

