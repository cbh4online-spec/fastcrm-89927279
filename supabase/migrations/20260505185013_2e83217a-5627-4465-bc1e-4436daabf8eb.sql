-- Bucket para notas de voz do Inbox
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inbox-voice-notes',
  'inbox-voice-notes',
  true,
  10485760, -- 10MB
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'];

-- Leitura pública (Z-API precisa baixar o áudio)
CREATE POLICY "inbox_voice_notes_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'inbox-voice-notes');

-- Upload por membros do workspace (1.ª pasta = workspace_id)
CREATE POLICY "inbox_voice_notes_workspace_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inbox-voice-notes'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id::text = (storage.foldername(name))[1]
      AND wm.user_id = auth.uid()
  )
);

-- Update/Delete pelos membros do workspace
CREATE POLICY "inbox_voice_notes_workspace_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'inbox-voice-notes'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id::text = (storage.foldername(name))[1]
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "inbox_voice_notes_workspace_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inbox-voice-notes'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id::text = (storage.foldername(name))[1]
      AND wm.user_id = auth.uid()
  )
);