
-- Storage bucket for context block attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('context-attachments', 'context-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Versions table: snapshot of block state at each save
CREATE TABLE public.context_block_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  snapshot_fields JSONB NOT NULL DEFAULT '[]',
  snapshot_rich_text TEXT,
  snapshot_tags TEXT[] DEFAULT '{}',
  snapshot_status TEXT DEFAULT 'draft',
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comments table
CREATE TABLE public.context_block_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attachments table (files + URLs)
CREATE TABLE public.context_block_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL DEFAULT 'url', -- 'url' or 'file'
  file_name TEXT NOT NULL,
  file_url TEXT, -- for URLs or storage path
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: context_block_versions
ALTER TABLE public.context_block_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view versions" ON public.context_block_versions
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create versions" ON public.context_block_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS: context_block_comments
ALTER TABLE public.context_block_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comments" ON public.context_block_comments
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create comments" ON public.context_block_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own comments" ON public.context_block_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.context_block_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: context_block_attachments
ALTER TABLE public.context_block_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view attachments" ON public.context_block_attachments
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create attachments" ON public.context_block_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete attachments" ON public.context_block_attachments
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Storage RLS for context-attachments bucket
CREATE POLICY "Members can upload context attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'context-attachments');

CREATE POLICY "Members can view context attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'context-attachments');

CREATE POLICY "Members can delete context attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'context-attachments');
