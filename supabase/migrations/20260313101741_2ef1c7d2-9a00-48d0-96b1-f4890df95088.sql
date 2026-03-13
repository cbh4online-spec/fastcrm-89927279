
-- Drop existing policies on invoice_payments
DROP POLICY IF EXISTS "Users can view invoice payments in their workspace" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can insert invoice payments in their workspace" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can delete invoice payments in their workspace" ON public.invoice_payments;

-- Recreate policies using is_workspace_member function (which includes super_admin check)
CREATE POLICY "Users can view invoice payments in their workspace"
ON public.invoice_payments FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert invoice payments in their workspace"
ON public.invoice_payments FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete invoice payments in their workspace"
ON public.invoice_payments FOR DELETE TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update invoice payments in their workspace"
ON public.invoice_payments FOR UPDATE TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
