
-- 1. Create storage bucket for call recordings (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'call-recordings', 'call-recordings', false,
  524288000,
  ARRAY['audio/mpeg','audio/wav','audio/webm','audio/ogg','audio/mp4',
        'video/mp4','video/webm','video/quicktime']
);

-- 2. Storage RLS policies for call-recordings bucket
CREATE POLICY "Workspace members can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-recordings'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = (SELECT auth.uid())
    AND wm.workspace_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Workspace members can read recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = (SELECT auth.uid())
    AND wm.workspace_id::text = (storage.foldername(name))[2]
  )
);

-- 3. Create recording_crm_links table
CREATE TABLE public.recording_crm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  linked_by TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS for recording_crm_links
ALTER TABLE public.recording_crm_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read crm links"
ON public.recording_crm_links FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = (SELECT auth.uid())
    AND wm.workspace_id = recording_crm_links.workspace_id
  )
);

CREATE POLICY "Workspace members can insert crm links"
ON public.recording_crm_links FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = (SELECT auth.uid())
    AND wm.workspace_id = recording_crm_links.workspace_id
  )
);

CREATE POLICY "Workspace members can delete crm links"
ON public.recording_crm_links FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.user_id = (SELECT auth.uid())
    AND wm.workspace_id = recording_crm_links.workspace_id
  )
);

-- 5. Enable realtime for recording_crm_links
ALTER PUBLICATION supabase_realtime ADD TABLE public.recording_crm_links;
