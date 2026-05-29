-- Make note-attachments bucket public so audio playback and file previews work
UPDATE storage.buckets SET public = true WHERE id = 'note-attachments';

-- Tighten upload policy to workspace members only (folder convention: workspace_id/...)
DROP POLICY IF EXISTS "Users can upload note attachments" ON storage.objects;
CREATE POLICY "Members can upload note attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'note-attachments'
  AND (
    is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT wm.workspace_id::text FROM workspace_members wm WHERE wm.user_id = auth.uid()
    )
  )
);

-- Replace overly permissive delete policy
DROP POLICY IF EXISTS "Users can delete note attachments" ON storage.objects;
CREATE POLICY "Members can delete note attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'note-attachments'
  AND (
    is_super_admin(auth.uid())
    OR (storage.foldername(name))[1] IN (
      SELECT wm.workspace_id::text FROM workspace_members wm WHERE wm.user_id = auth.uid()
    )
  )
);