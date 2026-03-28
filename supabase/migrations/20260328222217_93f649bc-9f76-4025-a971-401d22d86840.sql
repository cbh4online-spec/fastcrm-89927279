
CREATE TABLE public.funnel_ebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT 'lead_magnet',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, ebook_id)
);

ALTER TABLE public.funnel_ebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view funnel ebooks"
  ON public.funnel_ebooks FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert funnel ebooks"
  ON public.funnel_ebooks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete funnel ebooks"
  ON public.funnel_ebooks FOR DELETE
  TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
