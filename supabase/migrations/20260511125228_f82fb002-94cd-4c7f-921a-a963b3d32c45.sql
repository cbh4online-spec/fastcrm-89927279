
-- Hub unificado de gateways de pagamento por workspace
-- Stripe e ifthenpay já existem como integrações; esta tabela agrega o estado para o hub.

CREATE TABLE IF NOT EXISTS public.workspace_payment_gateways (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider     text NOT NULL CHECK (provider IN ('stripe','ifthenpay')),
  display_name text,
  is_active    boolean NOT NULL DEFAULT false,
  is_default   boolean NOT NULL DEFAULT false,
  test_mode    boolean NOT NULL DEFAULT true,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_health_at     timestamptz,
  last_health_status text,
  last_health_error  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_wpg_workspace ON public.workspace_payment_gateways(workspace_id);

ALTER TABLE public.workspace_payment_gateways ENABLE ROW LEVEL SECURITY;

-- SELECT: membros do workspace ou super admin
CREATE POLICY "wpg_select_members"
ON public.workspace_payment_gateways FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = workspace_payment_gateways.workspace_id
            AND wm.user_id = auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- INSERT/UPDATE/DELETE: apenas owner/admin do workspace ou super admin
CREATE POLICY "wpg_write_admins"
ON public.workspace_payment_gateways FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = workspace_payment_gateways.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner','admin'))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = workspace_payment_gateways.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner','admin'))
  OR public.is_super_admin(auth.uid())
);

CREATE TRIGGER trg_wpg_updated
BEFORE UPDATE ON public.workspace_payment_gateways
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Garantir que apenas um gateway é default por workspace
CREATE OR REPLACE FUNCTION public.wpg_enforce_single_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.workspace_payment_gateways
       SET is_default = false
     WHERE workspace_id = NEW.workspace_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wpg_single_default
AFTER INSERT OR UPDATE OF is_default ON public.workspace_payment_gateways
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.wpg_enforce_single_default();
