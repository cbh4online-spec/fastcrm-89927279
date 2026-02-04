-- Reorganizar políticas de INSERT para productivity_goals
-- Problema: metas individuais para outros utilizadores estavam a falhar

-- 1. Remover a política genérica problemática
DROP POLICY IF EXISTS "Users can create goals" ON productivity_goals;

-- 2. Criar política para metas individuais próprias
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

-- 3. Criar política para admins criarem metas individuais para outros membros
-- Permite que owners/admins atribuam metas individuais a qualquer membro do workspace
CREATE POLICY "Admins can create individual goals for members"
ON productivity_goals FOR INSERT
WITH CHECK (
  -- Meta individual
  goal_scope = 'individual'
  AND
  -- User_id é um membro válido do workspace
  user_id IN (
    SELECT wm.user_id FROM workspace_members wm
    WHERE wm.workspace_id = productivity_goals.workspace_id
  )
  AND
  -- Quem insere é owner/admin do workspace
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = productivity_goals.workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);