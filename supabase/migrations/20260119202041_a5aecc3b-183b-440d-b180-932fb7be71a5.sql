-- Adicionar políticas RLS para super admins na tabela workspace_industry_labels

-- Política para super admins verem todas as labels
CREATE POLICY "Super admins can view all industry labels"
ON public.workspace_industry_labels
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Política para super admins inserirem labels
CREATE POLICY "Super admins can insert industry labels"
ON public.workspace_industry_labels
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Política para super admins atualizarem labels
CREATE POLICY "Super admins can update industry labels"
ON public.workspace_industry_labels
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Política para super admins apagarem labels
CREATE POLICY "Super admins can delete industry labels"
ON public.workspace_industry_labels
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));