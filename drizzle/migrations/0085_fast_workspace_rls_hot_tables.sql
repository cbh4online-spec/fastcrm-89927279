CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
           SELECT 1 FROM public.workspace_members m
           WHERE m.workspace_id = _workspace_id AND m.user_id = _user_id
         )
      OR EXISTS (
           SELECT 1 FROM public.workspace_members m
           WHERE m.workspace_id = _user_id AND m.user_id = _workspace_id
         )
      OR public.is_super_admin(_user_id)
      OR public.is_super_admin(_workspace_id)
$function$;

ALTER POLICY "Users can view invoices in their workspace" ON public.invoices
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Users can view invoice items" ON public.invoice_items
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND i.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
    OR (SELECT public.is_super_admin(auth.uid()))
  );

ALTER POLICY "Users can view workspace invoice payments" ON public.invoice_payments
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Members can view payments" ON public.payments
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Members can view companies" ON public.companies
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Members can view contacts" ON public.contacts
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Members can view leads" ON public.leads
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Members can view opportunities" ON public.opportunities
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Members can view tasks" ON public.tasks
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "Users can view activities in their workspace" ON public.crm_activities
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

ALTER POLICY "cm_cases_all" ON public.collection_cases
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

ALTER POLICY "cm_case_invoices_all" ON public.collection_case_invoices
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));