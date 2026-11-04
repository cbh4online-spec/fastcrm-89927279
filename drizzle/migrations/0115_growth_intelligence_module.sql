ALTER TABLE public.marketplace_modules
  ADD COLUMN IF NOT EXISTS one_time_price_eur numeric,
  ADD COLUMN IF NOT EXISTS stripe_one_time_price_id text;

ALTER TABLE public.workspace_modules
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'subscription';

CREATE TABLE public.workspace_bgi_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_ids text[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.workspace_bgi_settings TO authenticated;
GRANT ALL ON public.workspace_bgi_settings TO service_role;
ALTER TABLE public.workspace_bgi_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bgi settings read by members" ON public.workspace_bgi_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));
CREATE POLICY "bgi settings insert by managers" ON public.workspace_bgi_settings FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "bgi settings update by managers" ON public.workspace_bgi_settings FOR UPDATE TO authenticated
  USING (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.can_manage_workspace(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.bgi_settings_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT (NEW.template_ids <@ ARRAY['commerce','education','saas','services','real_estate','custom']::text[]) THEN
    RAISE EXCEPTION 'Modelo de negócio inválido';
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bgi_settings_validate BEFORE INSERT OR UPDATE ON public.workspace_bgi_settings
  FOR EACH ROW EXECUTE FUNCTION public.bgi_settings_validate();
CREATE TRIGGER trg_bgi_settings_audit AFTER INSERT OR UPDATE ON public.workspace_bgi_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();