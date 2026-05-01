DO $$ BEGIN
  CREATE TYPE public.partner_slide_kind AS ENUM ('campaign', 'training', 'launch', 'education');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Função helper para verificar admin/owner de um workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role::text IN ('owner', 'admin')
  )
$$;

CREATE TABLE IF NOT EXISTS public.partner_portal_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind public.partner_slide_kind NOT NULL DEFAULT 'campaign',
  eyebrow TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'light',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_portal_slides_ws_active
  ON public.partner_portal_slides(workspace_id, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_partner_portal_slides_window
  ON public.partner_portal_slides(workspace_id, starts_at, ends_at);

ALTER TABLE public.partner_portal_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace slides"
ON public.partner_portal_slides
FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Workspace admins can insert slides"
ON public.partner_portal_slides
FOR INSERT
WITH CHECK (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Workspace admins can update slides"
ON public.partner_portal_slides
FOR UPDATE
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Workspace admins can delete slides"
ON public.partner_portal_slides
FOR DELETE
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_super_admin(auth.uid())
);

DROP TRIGGER IF EXISTS trg_partner_portal_slides_updated ON public.partner_portal_slides;
CREATE TRIGGER trg_partner_portal_slides_updated
BEFORE UPDATE ON public.partner_portal_slides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();