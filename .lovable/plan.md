

# Notas/Comentários no Editor de eBooks

## Contexto

Actualmente as notas só aparecem no FlipbookReader (pré-visualização). O utilizador quer poder tirar notas e fazer comentários directamente na vista de edição, associadas ao capítulo activo, para facilitar correcções.

## Abordagem

Adicionar uma 4ª tab **"Notas"** na sidebar direita do editor, reutilizando o hook `useEbookNotes` existente e o componente `EbookNotesPanel` (adaptado para o tema claro do editor). As notas serão associadas ao índice do capítulo (`page_number` = índice do capítulo), permitindo correspondência entre editor e flipbook.

## Implementação

### 1. `EbookEditorNotesPanel.tsx` (novo)

- Versão adaptada do `EbookNotesPanel` com tema claro (bg-background em vez de slate-900)
- Mostra notas filtradas pelo capítulo activo (usando índice do capítulo como `page_number`)
- Form inline para adicionar nota ao capítulo actual
- Botão eliminar por nota
- Sem o botão "navegar para página" (estamos no editor, o clique selecciona o capítulo)

### 2. `EbookEditor.tsx`

- Adicionar tab "Notas" (ícone `StickyNote`) à sidebar direita, ao lado de Inserir/Estilo/Marca
- Importar `useEbookNotes` e passar dados ao novo painel
- Ao clicar numa nota de outro capítulo, mudar o `activeChapterId` para o capítulo correspondente
- Badge com contagem de notas no tab trigger

### Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/components/ebooks/EbookEditorNotesPanel.tsx` | Novo — painel de notas para editor |
| `src/components/ebooks/EbookEditor.tsx` | Adicionar tab "Notas" na sidebar + integrar hook |

### Critérios de Aceitação

- Tab "Notas" visível na sidebar direita do editor
- Notas filtradas pelo capítulo activo com opção de ver todas
- Adicionar/eliminar notas persiste na base de dados
- Clicar numa nota de outro capítulo navega para esse capítulo
- Badge com contagem total de notas no tab
- As mesmas notas aparecem no FlipbookReader (sincronização via DB)

