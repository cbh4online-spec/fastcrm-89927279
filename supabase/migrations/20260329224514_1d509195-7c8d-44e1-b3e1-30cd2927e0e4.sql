
CREATE TABLE public.ebook_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ebook_id uuid NOT NULL,
  user_id uuid NOT NULL,
  page_number integer NOT NULL,
  note_text text NOT NULL,
  note_type text NOT NULL DEFAULT 'note',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ebook_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their workspace ebook notes"
  ON public.ebook_notes FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_ebook_notes_ebook_id ON public.ebook_notes(ebook_id);
CREATE INDEX idx_ebook_notes_workspace_id ON public.ebook_notes(workspace_id);
