DROP POLICY IF EXISTS "workspace_members_voice_audio" ON storage.objects;
CREATE POLICY "workspace_members_read_voice_audio" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-audio'
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = (SELECT auth.uid())
        AND wm.workspace_id::text = (storage.foldername(name))[1]
    )
  );