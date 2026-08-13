DROP POLICY IF EXISTS "Users can view workspace invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can insert workspace invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can update workspace invoice payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "Users can delete workspace invoice payments" ON public.invoice_payments;

CREATE POLICY "Users can view workspace invoice payments"
ON public.invoice_payments FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert workspace invoice payments"
ON public.invoice_payments FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can update workspace invoice payments"
ON public.invoice_payments FOR UPDATE TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete workspace invoice payments"
ON public.invoice_payments FOR DELETE TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;