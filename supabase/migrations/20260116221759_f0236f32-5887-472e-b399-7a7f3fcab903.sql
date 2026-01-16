-- Corrigir recursão entre calendars e calendar_user_assignments

-- 1. Criar função para verificar acesso do usuário a calendários (sem recursão)
CREATE OR REPLACE FUNCTION public.get_user_calendar_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT calendar_id FROM calendar_user_assignments WHERE user_id = auth.uid()
$$;

-- 2. Criar função para verificar se usuário está no workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$;

-- 3. Recriar política SELECT de calendars usando as funções
DROP POLICY IF EXISTS "Users can view calendars they have access to" ON calendars;

CREATE POLICY "Users can view calendars they have access to"
ON calendars
FOR SELECT
USING (
  workspace_id IN (SELECT public.get_user_workspace_ids())
  AND (
    is_public = true 
    OR created_by = auth.uid()
    OR id IN (SELECT public.get_user_calendar_ids())
  )
);

-- 4. Recriar política SELECT de calendar_user_assignments sem referência a calendars
DROP POLICY IF EXISTS "Users can view user assignments" ON calendar_user_assignments;

CREATE POLICY "Users can view user assignments"
ON calendar_user_assignments
FOR SELECT
USING (
  user_id = auth.uid()
  OR calendar_id IN (
    SELECT c.id FROM calendars c 
    WHERE c.created_by = auth.uid()
  )
);