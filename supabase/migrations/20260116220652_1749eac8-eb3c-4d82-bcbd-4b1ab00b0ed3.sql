-- Passo 1: Remover política problemática de calendar_permissions
DROP POLICY IF EXISTS "Users can view permissions for accessible calendars" ON calendar_permissions;

-- Passo 2: Criar nova política sem referência circular
CREATE POLICY "Users can view permissions for accessible calendars"
ON calendar_permissions
FOR SELECT
USING (
  user_id = auth.uid() 
  OR calendar_id IN (
    SELECT c.id FROM calendars c
    INNER JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE wm.user_id = auth.uid() AND c.created_by = auth.uid()
  )
);

-- Passo 3: Atualizar política de calendars para evitar recursão
DROP POLICY IF EXISTS "Users can view calendars they have access to" ON calendars;

CREATE POLICY "Users can view calendars they have access to"
ON calendars
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
  AND (
    is_public = true 
    OR created_by = auth.uid()
    OR id IN (SELECT calendar_id FROM calendar_user_assignments WHERE user_id = auth.uid())
  )
);