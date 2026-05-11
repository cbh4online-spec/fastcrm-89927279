
-- Provider enum
DO $$ BEGIN
  CREATE TYPE public.billing_provider AS ENUM ('invoicexpress','moloni','vendus','sage','primavera');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.workspace_billing_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider public.billing_provider NOT NULL,
  display_name text,
  account_name text NOT NULL,
  api_key_encrypted text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  last_check_at timestamptz,
  last_check_status text,
  last_check_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wbi_workspace ON public.workspace_billing_integrations(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wbi_default_per_workspace
  ON public.workspace_billing_integrations(workspace_id) WHERE is_default;

ALTER TABLE public.workspace_billing_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wbi_select_admins" ON public.workspace_billing_integrations;
CREATE POLICY "wbi_select_admins" ON public.workspace_billing_integrations
  FOR SELECT TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "wbi_insert_admins" ON public.workspace_billing_integrations;
CREATE POLICY "wbi_insert_admins" ON public.workspace_billing_integrations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "wbi_update_admins" ON public.workspace_billing_integrations;
CREATE POLICY "wbi_update_admins" ON public.workspace_billing_integrations
  FOR UPDATE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "wbi_delete_admins" ON public.workspace_billing_integrations;
CREATE POLICY "wbi_delete_admins" ON public.workspace_billing_integrations
  FOR DELETE TO authenticated
  USING (public.is_workspace_admin(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- Safe view (omit api_key_encrypted)
CREATE OR REPLACE VIEW public.workspace_billing_integrations_safe
WITH (security_invoker = true) AS
SELECT
  id, workspace_id, provider, display_name, account_name,
  config, is_active, is_default,
  last_check_at, last_check_status, last_check_error,
  created_by, created_at, updated_at,
  CASE WHEN api_key_encrypted IS NOT NULL AND length(api_key_encrypted) > 0
       THEN '••••••••' || right(api_key_encrypted, 4)
       ELSE NULL END AS api_key_masked
FROM public.workspace_billing_integrations;

GRANT SELECT ON public.workspace_billing_integrations_safe TO authenticated;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_wbi_updated_at ON public.workspace_billing_integrations;
CREATE TRIGGER trg_wbi_updated_at
  BEFORE UPDATE ON public.workspace_billing_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default per workspace via trigger
CREATE OR REPLACE FUNCTION public.wbi_enforce_single_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.workspace_billing_integrations
       SET is_default = false
     WHERE workspace_id = NEW.workspace_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wbi_single_default ON public.workspace_billing_integrations;
CREATE TRIGGER trg_wbi_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.workspace_billing_integrations
  FOR EACH ROW EXECUTE FUNCTION public.wbi_enforce_single_default();
