

# Sublinhado de Texto com Ligação a Notas no Flipbook Reader

## Contexto

O utilizador quer poder seleccionar texto nas páginas do flipbook, sublinhá-lo (highlight), e associar esse sublinhado a uma nota. Actualmente as notas são livres (sem referência ao texto), e o flipbook não suporta selecção/sublinhado.

## Abordagem

### 1. Migração DB — Adicionar colunas de highlight à tabela `ebook_notes`

Adicionar 3 colunas à tabela `ebook_notes`:
- `highlight_text` (text, nullable) — o texto seleccionado
- `highlight_color` (text, default `'#fde68a'`) — cor do sublinhado
- `highlight_range` (jsonb, nullable) — posição do texto na página (para re-renderizar o highlight)

### 2. Componente `FlipbookHighlightLayer.tsx` (novo)

Overlay transparente sobre cada página que:
- Detecta `selectionchange` / `mouseup` com texto seleccionado
- Mostra um mini-popover "Sublinhar + Nota" quando há selecção
- Renderiza os highlights existentes (spans com background-color) sobre o texto da página
- Ao clicar num highlight existente, mostra a nota associada

### 3. Actualizar `FlipbookPage.tsx`

- Aceitar prop `highlights` (array de highlights desta página)
- Renderizar o conteúdo com os highlights aplicados (wrapping do texto em `<mark>` com a cor correspondente)
- Cada `<mark>` clicável para ver/editar a nota associada

### 4. Actualizar `useEbookNotes.ts`

- Expandir a interface `EbookNote` com os novos campos
- Actualizar `addNote` para aceitar `highlightText`, `highlightColor`, `highlightRange`
- Adicionar filtro por `note_type = 'highlight'` vs `'note'`

### 5. Actualizar `FlipbookReader.tsx`

- Passar highlights filtrados por página ao `FlipbookPage`
- Integrar o popover de criação de highlight+nota no fluxo de selecção
- Ao criar highlight, abrir automaticamente o painel de notas

### 6. Actualizar `EbookNotesPanel.tsx`

- Mostrar ícone diferente para notas com highlight (marcador vs nota)
- Exibir o texto sublinhado como citação na nota
- Ao clicar, navegar para a página e realçar o highlight

## Ficheiros

| Ficheiro | Acção |
|---|---|
| Migração SQL | Adicionar `highlight_text`, `highlight_color`, `highlight_range` à `ebook_notes` |
| `src/components/ebooks/FlipbookHighlightPopover.tsx` | Novo — popover que aparece ao seleccionar texto |
| `src/components/ebooks/FlipbookPage.tsx` | Renderizar highlights no conteúdo |
| `src/hooks/useEbookNotes.ts` | Expandir interface e mutações com campos de highlight |
| `src/components/ebooks/FlipbookReader.tsx` | Integrar selecção de texto e highlights por página |
| `src/components/ebooks/EbookNotesPanel.tsx` | Diferenciar notas com/sem highlight |
| `src/components/ebooks/EbookEditorNotesPanel.tsx` | Diferenciar notas com/sem highlight |

## Critérios de Aceitação

- Seleccionar texto numa página mostra popover "Sublinhar"
- Ao sublinhar, pede opcionalmente uma nota e persiste na DB
- Highlights visíveis com cor de fundo nas páginas
- Clicar num highlight mostra a nota associada
- Notas com highlight mostram o texto citado no painel
- Funciona com protecção activa (pointer-events selectivos)
- Escolha de cor do highlight (amarelo, verde, azul, rosa)

