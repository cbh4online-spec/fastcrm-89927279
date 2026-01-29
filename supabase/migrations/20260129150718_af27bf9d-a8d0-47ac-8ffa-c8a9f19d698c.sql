-- 1. Adicionar política de SELECT para Super Admins
CREATE POLICY "Super admins can view all ai_personas"
  ON public.ai_personas
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- 2. Adicionar política de INSERT para Super Admins
CREATE POLICY "Super admins can insert ai_personas"
  ON public.ai_personas
  FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. Adicionar política de UPDATE para Super Admins
CREATE POLICY "Super admins can update all ai_personas"
  ON public.ai_personas
  FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- 4. Adicionar política de DELETE para Super Admins
CREATE POLICY "Super admins can delete all ai_personas"
  ON public.ai_personas
  FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- 5. Corrigir a política existente adicionando WITH CHECK
DROP POLICY IF EXISTS "Users can manage AI personas in their workspace" ON public.ai_personas;

CREATE POLICY "Users can manage AI personas in their workspace"
  ON public.ai_personas
  FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));