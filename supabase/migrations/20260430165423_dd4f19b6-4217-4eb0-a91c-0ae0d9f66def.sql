-- 1) Coluna nova
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_payment_gateway boolean NOT NULL DEFAULT false;

-- 2) Garantir que só existe UM workspace gateway na plataforma
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_single_payment_gateway_idx
  ON public.workspaces ((is_payment_gateway))
  WHERE is_payment_gateway = true;

-- 3) Helper: obter o workspace gateway
CREATE OR REPLACE FUNCTION public.get_payment_gateway_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workspaces WHERE is_payment_gateway = true LIMIT 1;
$$;

-- 4) Trigger: só super-admins podem alterar a flag
CREATE OR REPLACE FUNCTION public.enforce_payment_gateway_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.is_payment_gateway = true)
     OR (TG_OP = 'UPDATE' AND COALESCE(OLD.is_payment_gateway, false) IS DISTINCT FROM COALESCE(NEW.is_payment_gateway, false))
  THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Apenas super-admins podem definir o workspace gateway de pagamentos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_gateway_admin ON public.workspaces;
CREATE TRIGGER trg_enforce_payment_gateway_admin
  BEFORE INSERT OR UPDATE OF is_payment_gateway ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_gateway_admin();