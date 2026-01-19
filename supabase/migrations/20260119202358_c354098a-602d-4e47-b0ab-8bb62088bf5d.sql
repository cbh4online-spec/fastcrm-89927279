-- Políticas RLS para super admins na tabela activity_profiles

-- Super admins podem ver todos os perfis
CREATE POLICY "Super admins can view all profiles"
ON public.activity_profiles
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admins podem inserir perfis
CREATE POLICY "Super admins can insert profiles"
ON public.activity_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Super admins podem atualizar perfis
CREATE POLICY "Super admins can update profiles"
ON public.activity_profiles
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admins podem apagar perfis
CREATE POLICY "Super admins can delete profiles"
ON public.activity_profiles
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));