
-- 1. Add manifest_json column to marketplace_modules
ALTER TABLE public.marketplace_modules
  ADD COLUMN IF NOT EXISTS manifest_json jsonb DEFAULT '{}'::jsonb;

-- 2. Create extension_audit_logs table
CREATE TABLE public.extension_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  extension_key text NOT NULL,
  action text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_extension_audit_action()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action NOT IN ('enable', 'disable') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be enable or disable.', NEW.action;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_extension_audit_action
  BEFORE INSERT OR UPDATE ON public.extension_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_extension_audit_action();

-- 4. RLS
ALTER TABLE public.extension_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own workspace audit logs"
  ON public.extension_audit_logs FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert audit logs"
  ON public.extension_audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- 5. Index
CREATE INDEX idx_extension_audit_workspace ON public.extension_audit_logs(workspace_id, created_at DESC);
