

# Notas e Comentários no Leitor de eBooks

## Contexto

O FlipbookReader é usado em dois contextos: editor interno (EbookEditor) e página pública (PublicEbookPage). As notas/comentários fazem sentido no contexto autenticado (editor), associadas a um eBook e página específica.

## Implementação

### 1. Tabela `ebook_notes` (migração SQL)

```sql
CREATE TABLE public.ebook_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ebook_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  note_text text NOT NULL,
  note_type text NOT NULL DEFAULT 'note', -- 'note' | 'comment'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ebook_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their workspace ebook notes"
  ON public.ebook_notes FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
```

### 2. Hook `useEbookNotes.ts`

- `useQuery` para listar notas por `ebook_id`
- `addNote` mutation (page_number, note_text, note_type)
- `deleteNote` mutation
- `updateNote` mutation

### 3. Componente `EbookNotesPanel.tsx`

Painel lateral deslizante (à direita do flipbook) com:
- Lista de notas agrupadas por página
- Botão "+" para adicionar nota na página atual
- Textarea para escrever a nota
- Cada nota mostra: texto, página, data, botão eliminar
- Clicar numa nota navega para a página correspondente (`onGoToPage`)

### 4. Integração no `FlipbookReader.tsx`

- Nova prop opcional `ebookId?: string` — quando presente, activa funcionalidade de notas
- Botão "Notas" (ícone `StickyNote`) na toolbar
- Toggle do painel lateral de notas
- Indicador visual de páginas que têm notas (dot no thumbnail)

### 5. Botão na `FlipbookToolbar.tsx`

- Novo botão `StickyNote` entre Print e Fullscreen
- Prop `onToggleNotes` + `showNotes` + `notesCount`
- Badge com contagem de notas

### Ficheiros

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar tabela `ebook_notes` com RLS |
| `src/hooks/useEbookNotes.ts` | Novo — CRUD de notas |
| `src/components/ebooks/EbookNotesPanel.tsx` | Novo — painel lateral de notas |
| `src/components/ebooks/FlipbookToolbar.tsx` | Adicionar botão notas |
| `src/components/ebooks/FlipbookReader.tsx` | Integrar painel + passar ebookId |
| `src/components/ebooks/EbookEditor.tsx` | Passar ebookId ao FlipbookReader |

### Critérios de Aceitação

- Utilizador pode adicionar/editar/eliminar notas por página
- Notas persistem na base de dados por workspace
- Painel lateral não interfere com a navegação do flipbook
- Clicar numa nota navega para a página correspondente
- Thumbnails mostram indicador de páginas com notas
- Funcionalidade só disponível em contexto autenticado (não na página pública)

