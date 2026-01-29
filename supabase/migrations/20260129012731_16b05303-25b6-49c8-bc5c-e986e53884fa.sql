-- Create entity_notes table for notes with voice and attachments
CREATE TABLE public.entity_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'company', 'opportunity')),
  entity_id UUID NOT NULL,
  content TEXT,
  note_type TEXT NOT NULL DEFAULT 'text' CHECK (note_type IN ('text', 'voice')),
  -- Voice note specific
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  transcription TEXT,
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  -- Metadata
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_entity_notes_entity ON public.entity_notes(entity_type, entity_id);
CREATE INDEX idx_entity_notes_workspace ON public.entity_notes(workspace_id);
CREATE INDEX idx_entity_notes_created ON public.entity_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.entity_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view notes in their workspace"
ON public.entity_notes FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create notes in their workspace"
ON public.entity_notes FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update notes in their workspace"
ON public.entity_notes FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete notes in their workspace"
ON public.entity_notes FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_entity_notes_updated_at
BEFORE UPDATE ON public.entity_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for note attachments
CREATE POLICY "Note attachments are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-attachments');

CREATE POLICY "Users can upload note attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'note-attachments');

CREATE POLICY "Users can delete note attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'note-attachments');