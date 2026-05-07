
CREATE TABLE IF NOT EXISTS public.product_audit_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  status TEXT,
  validated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_audit_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_super_admin" ON public.product_audit_validations;
CREATE POLICY "audit_select_super_admin"
  ON public.product_audit_validations FOR SELECT
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "audit_insert_super_admin" ON public.product_audit_validations;
CREATE POLICY "audit_insert_super_admin"
  ON public.product_audit_validations FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "audit_update_super_admin" ON public.product_audit_validations;
CREATE POLICY "audit_update_super_admin"
  ON public.product_audit_validations FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_product_audit_updated_at ON public.product_audit_validations;
CREATE TRIGGER trg_product_audit_updated_at
  BEFORE UPDATE ON public.product_audit_validations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
