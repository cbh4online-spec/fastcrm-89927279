-- =====================================================
-- REORGANIZAR POLÍTICAS RLS DE productivity_goals
-- Adicionar verificação is_super_admin() a SELECT, UPDATE e DELETE
-- =====================================================

-- 1. POLÍTICAS DE SELECT - Adicionar super admin
DROP POLICY IF EXISTS "Users can view goals in their workspace" ON productivity_goals;
DROP POLICY IF EXISTS "Users can view organizational goals in their workspace" ON productivity_goals;

CREATE POLICY "Users can view goals in their workspace"
ON productivity_goals FOR SELECT
USING (
  public.is_super_admin()
  OR
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- 2. POLÍTICAS DE UPDATE - Adicionar super admin
DROP POLICY IF EXISTS "Users can update their goals" ON productivity_goals;
DROP POLICY IF EXISTS "Members can update organizational goals" ON productivity_goals;

CREATE POLICY "Users can update goals"
ON productivity_goals FOR UPDATE
USING (
  public.is_super_admin()
  OR
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = productivity_goals.workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- 3. POLÍTICAS DE DELETE - Adicionar super admin
DROP POLICY IF EXISTS "Users can delete their goals" ON productivity_goals;
DROP POLICY IF EXISTS "Admins can delete organizational goals" ON productivity_goals;

CREATE POLICY "Users can delete goals"
ON productivity_goals FOR DELETE
USING (
  public.is_super_admin()
  OR
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = productivity_goals.workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);