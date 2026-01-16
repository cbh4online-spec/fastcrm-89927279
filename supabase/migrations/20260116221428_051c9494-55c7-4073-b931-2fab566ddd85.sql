-- Corrigir recursão infinita nas políticas RLS de calendários

-- 1. Remover política UPDATE problemática de calendars
DROP POLICY IF EXISTS "Users can update calendars they own or have admin permission" ON calendars;

-- 2. Criar política UPDATE simplificada sem referência a calendar_permissions
-- Para evitar recursão, apenas o criador pode atualizar (admin permission pode ser verificado no código)
CREATE POLICY "Users can update calendars they own"
ON calendars
FOR UPDATE
USING (created_by = auth.uid());

-- 3. Corrigir política ALL de calendar_permissions para evitar recursão
DROP POLICY IF EXISTS "Calendar owners can manage permissions" ON calendar_permissions;

-- Usar uma função SECURITY DEFINER para verificar ownership sem recursão
CREATE OR REPLACE FUNCTION public.is_calendar_owner(cal_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM calendars c
    WHERE c.id = cal_id 
    AND c.created_by = auth.uid()
  );
$$;

-- Recriar política usando a função
CREATE POLICY "Calendar owners can manage permissions"
ON calendar_permissions
FOR ALL
USING (public.is_calendar_owner(calendar_id))
WITH CHECK (public.is_calendar_owner(calendar_id));

-- 4. Corrigir política ALL de calendar_user_assignments
DROP POLICY IF EXISTS "Calendar owners can manage user assignments" ON calendar_user_assignments;

CREATE POLICY "Calendar owners can manage user assignments"
ON calendar_user_assignments
FOR ALL
USING (public.is_calendar_owner(calendar_id))
WITH CHECK (public.is_calendar_owner(calendar_id));