
-- Corrigir company_financing
DROP POLICY IF EXISTS "Workspace members can view company financing" ON public.company_financing;
DROP POLICY IF EXISTS "Workspace members can insert company financing" ON public.company_financing;
DROP POLICY IF EXISTS "Workspace members can update company financing" ON public.company_financing;
DROP POLICY IF EXISTS "Workspace members can delete company financing" ON public.company_financing;

CREATE POLICY "Workspace members can view company financing"
  ON public.company_financing FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can insert company financing"
  ON public.company_financing FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update company financing"
  ON public.company_financing FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can delete company financing"
  ON public.company_financing FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Corrigir company_financing_simulations
DROP POLICY IF EXISTS "Workspace members can view financing simulations" ON public.company_financing_simulations;
DROP POLICY IF EXISTS "Workspace members can insert financing simulations" ON public.company_financing_simulations;
DROP POLICY IF EXISTS "Workspace members can update financing simulations" ON public.company_financing_simulations;
DROP POLICY IF EXISTS "Workspace members can delete financing simulations" ON public.company_financing_simulations;

CREATE POLICY "Workspace members can view financing simulations"
  ON public.company_financing_simulations FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can insert financing simulations"
  ON public.company_financing_simulations FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can update financing simulations"
  ON public.company_financing_simulations FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Workspace members can delete financing simulations"
  ON public.company_financing_simulations FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));
