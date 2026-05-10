CREATE TABLE public.whatsapp_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  cached_count INTEGER NOT NULL DEFAULT 0,
  cached_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_segments_ws ON public.whatsapp_segments(workspace_id) WHERE is_archived = false;

ALTER TABLE public.whatsapp_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace segments"
ON public.whatsapp_segments FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can create workspace segments"
ON public.whatsapp_segments FOR INSERT
WITH CHECK (
  workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Members can update workspace segments"
ON public.whatsapp_segments FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete workspace segments"
ON public.whatsapp_segments FOR DELETE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE TRIGGER update_whatsapp_segments_updated_at
BEFORE UPDATE ON public.whatsapp_segments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();