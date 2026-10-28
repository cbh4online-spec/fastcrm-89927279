CREATE TABLE public.workspace_member_capability_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  capability text NOT NULL CHECK (capability IN ('finance.manage','finance.view')),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, capability)
);
GRANT SELECT, INSERT, DELETE ON public.workspace_member_capability_grants TO authenticated;
GRANT ALL ON public.workspace_member_capability_grants TO service_role;
ALTER TABLE public.workspace_member_capability_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_workspace_capability(_user_id uuid, _workspace_id uuid, _cap text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id=_workspace_id AND m.user_id=_user_id AND m.role::text IN ('owner','admin','agency'))
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id=_workspace_id AND w.owner_id=_user_id)
    OR EXISTS (SELECT 1 FROM public.workspace_member_capability_grants g JOIN public.workspace_members m ON m.workspace_id=g.workspace_id AND m.user_id=g.user_id
               WHERE g.workspace_id=_workspace_id AND g.user_id=_user_id AND g.capability=_cap)
$$;

CREATE POLICY "Members read grants" ON public.workspace_member_capability_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_workspace_capability(auth.uid(), workspace_id, '__manage__'));
CREATE POLICY "Managers insert grants" ON public.workspace_member_capability_grants FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_capability(auth.uid(), workspace_id, '__manage__') AND granted_by = auth.uid());
CREATE POLICY "Managers delete grants" ON public.workspace_member_capability_grants FOR DELETE TO authenticated
  USING (public.has_workspace_capability(auth.uid(), workspace_id, '__manage__'));

DROP POLICY IF EXISTS "Users can update workspace invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can delete workspace invoice payments" ON public.invoice_payments;
CREATE POLICY "Finance managers update invoice payments" ON public.invoice_payments FOR UPDATE TO authenticated
  USING (public.has_workspace_capability(auth.uid(), workspace_id, 'finance.manage'))
  WITH CHECK (public.has_workspace_capability(auth.uid(), workspace_id, 'finance.manage'));
CREATE POLICY "Finance managers delete invoice payments" ON public.invoice_payments FOR DELETE TO authenticated
  USING (public.has_workspace_capability(auth.uid(), workspace_id, 'finance.manage'));