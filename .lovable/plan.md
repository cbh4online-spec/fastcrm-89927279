

# Fix: Edição e Eliminação de Páginas na Sidebar

## Diagnóstico

O `ChapterThumbnail` não tem nenhum menu de acções — não permite apagar, duplicar ou reordenar páginas directamente na sidebar. O `BlockActionMenu` existe mas só aparece na toolbar do capítulo activo (linha 617 do EbookEditor). O utilizador tem de seleccionar um capítulo e procurar o menu "..." na toolbar para aceder a estas acções — fluxo pouco intuitivo.

## Plano

### 1. `ChapterThumbnail.tsx` — Adicionar menu de contexto

- Aceitar novos props: `onDuplicate`, `onDelete`, `onMoveUp`, `onMoveDown`
- Adicionar um botão "..." (MoreVertical) no canto inferior-direito do thumbnail, visível no hover
- Usar `DropdownMenu` com opções: Mover acima, Mover abaixo, Duplicar, Eliminar
- O clique no botão "..." deve usar `e.stopPropagation()` para não activar o capítulo

### 2. `EbookEditor.tsx` — Passar as acções ao thumbnail

- No mapeamento dos thumbnails (linha 507-521), passar as funções `removeChapter`, `duplicateChapter`, `moveChapter` como props ao `ChapterThumbnail`

## Ficheiros a Modificar

| Ficheiro | Alteração |
|---|---|
| `src/components/ebooks/ChapterThumbnail.tsx` | Adicionar dropdown com acções (apagar, duplicar, mover) |
| `src/components/ebooks/EbookEditor.tsx` | Passar props de acções ao ChapterThumbnail |

## Critérios de Aceitação
- Hover no thumbnail mostra botão "..." com menu de acções
- "Eliminar" remove o capítulo
- "Duplicar" cria cópia
- "Mover acima/abaixo" reordena
- Clique no "..." não selecciona o capítulo

