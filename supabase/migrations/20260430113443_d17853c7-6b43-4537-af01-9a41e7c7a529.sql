-- 1. Audit log table
CREATE TABLE IF NOT EXISTS public.profile_permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  actor_user_id UUID,
  table_name TEXT NOT NULL CHECK (table_name IN ('profile_field_permissions','profile_menu_permissions')),
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  sales_function TEXT,
  page_key TEXT,
  field_key TEXT,
  menu_key TEXT,
  old_visible BOOLEAN,
  new_visible BOOLEAN,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppal_workspace_changed
  ON public.profile_permission_audit_log (workspace_id, changed_at DESC);

ALTER TABLE public.profile_permission_audit_log ENABLE ROW LEVEL SECURITY;

-- 2. Policies: SELECT for owner/admin; no client INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can view permission audit log" ON public.profile_permission_audit_log;
CREATE POLICY "Admins can view permission audit log"
ON public.profile_permission_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = profile_permission_audit_log.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner','admin')
  )
);

-- 3. Trigger function for field permissions
CREATE OR REPLACE FUNCTION public.log_profile_field_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profile_permission_audit_log
      (workspace_id, actor_user_id, table_name, action, sales_function, page_key, field_key, old_visible, new_visible)
    VALUES (NEW.workspace_id, auth.uid(), 'profile_field_permissions', 'INSERT',
            NEW.sales_function, NEW.page_key, NEW.field_key, NULL, NEW.visible);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.visible IS DISTINCT FROM NEW.visible THEN
      INSERT INTO public.profile_permission_audit_log
        (workspace_id, actor_user_id, table_name, action, sales_function, page_key, field_key, old_visible, new_visible)
      VALUES (NEW.workspace_id, auth.uid(), 'profile_field_permissions', 'UPDATE',
              NEW.sales_function, NEW.page_key, NEW.field_key, OLD.visible, NEW.visible);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.profile_permission_audit_log
      (workspace_id, actor_user_id, table_name, action, sales_function, page_key, field_key, old_visible, new_visible)
    VALUES (OLD.workspace_id, auth.uid(), 'profile_field_permissions', 'DELETE',
            OLD.sales_function, OLD.page_key, OLD.field_key, OLD.visible, NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_field_permission ON public.profile_field_permissions;
CREATE TRIGGER trg_log_profile_field_permission
AFTER INSERT OR UPDATE OR DELETE ON public.profile_field_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_profile_field_permission_change();

-- 4. Trigger function for menu permissions
CREATE OR REPLACE FUNCTION public.log_profile_menu_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profile_permission_audit_log
      (workspace_id, actor_user_id, table_name, action, sales_function, menu_key, old_visible, new_visible)
    VALUES (NEW.workspace_id, auth.uid(), 'profile_menu_permissions', 'INSERT',
            NEW.sales_function, NEW.menu_key, NULL, NEW.visible);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.visible IS DISTINCT FROM NEW.visible THEN
      INSERT INTO public.profile_permission_audit_log
        (workspace_id, actor_user_id, table_name, action, sales_function, menu_key, old_visible, new_visible)
      VALUES (NEW.workspace_id, auth.uid(), 'profile_menu_permissions', 'UPDATE',
              NEW.sales_function, NEW.menu_key, OLD.visible, NEW.visible);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.profile_permission_audit_log
      (workspace_id, actor_user_id, table_name, action, sales_function, menu_key, old_visible, new_visible)
    VALUES (OLD.workspace_id, auth.uid(), 'profile_menu_permissions', 'DELETE',
            OLD.sales_function, OLD.menu_key, OLD.visible, NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_menu_permission ON public.profile_menu_permissions;
CREATE TRIGGER trg_log_profile_menu_permission
AFTER INSERT OR UPDATE OR DELETE ON public.profile_menu_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_profile_menu_permission_change();