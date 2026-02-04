
-- Actualizar políticas de INSERT para productivity_goals para incluir super admins
-- Super admins têm acesso global a todos os workspaces

-- 1. Remover as políticas de INSERT actuais
DROP POLICY IF EXISTS "Users can create own individual goals" ON productivity_goals;
DROP POLICY IF EXISTS "Admins can create individual goals for members" ON productivity_goals;
DROP POLICY IF EXISTS "Admins can create organizational goals" ON productivity_goals;

-- 2. Recriar política para metas individuais próprias
-- Permite que qualquer membro crie metas individuais para si próprio
CREATE POLICY "Users can create own individual goals"
ON productivity_goals FOR INSERT
WITH CHECK (
  -- Meta individual
  goal_scope = 'individual' 
  AND
  -- User_id é o próprio utilizador
  user_id = auth.uid()
  AND
  -- Pertence ao workspace
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- 3. Política para admins/owners criarem metas individuais para outros membros
CREATE POLICY "Admins can create individual goals for members"
ON productivity_goals FOR INSERT
WITH CHECK (
  goal_scope = 'individual'
  AND
  (
    -- Super admin tem acesso global
    public.is_super_admin()
    OR
    -- Owner/admin do workspace
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = productivity_goals.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- 4. Política para criar metas organizacionais
CREATE POLICY "Admins can create organizational goals"
ON productivity_goals FOR INSERT
WITH CHECK (
  goal_scope = 'organizational'
  AND
  (
    -- Super admin tem acesso global
    public.is_super_admin()
    OR
    -- Owner/admin do workspace
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = productivity_goals.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);
