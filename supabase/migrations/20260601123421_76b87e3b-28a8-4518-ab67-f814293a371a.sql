
CREATE TABLE public.rental_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  contract_number text NOT NULL,
  end_client_company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  end_client_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  financier_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','ended','renewed','cancelled','defaulted')),
  start_date date,
  end_date date,
  duration_months integer,
  monthly_amount numeric(12,2) DEFAULT 0,
  total_financed numeric(12,2) NOT NULL DEFAULT 0,
  financier_commission numeric(12,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  notes text,
  liquid_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_note_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  renewed_from_id uuid REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, contract_number)
);
CREATE INDEX idx_rental_contracts_workspace ON public.rental_contracts(workspace_id);
CREATE INDEX idx_rental_contracts_end_client ON public.rental_contracts(end_client_company_id);
CREATE INDEX idx_rental_contracts_financier ON public.rental_contracts(financier_company_id);
CREATE INDEX idx_rental_contracts_status ON public.rental_contracts(workspace_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_contracts TO authenticated;
GRANT ALL ON public.rental_contracts TO service_role;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_contracts_select" ON public.rental_contracts FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "rental_contracts_insert" ON public.rental_contracts FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());
CREATE POLICY "rental_contracts_update" ON public.rental_contracts FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "rental_contracts_delete" ON public.rental_contracts FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_rental_contracts_updated_at BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rental_contract_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_contract_items_contract ON public.rental_contract_items(contract_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_contract_items TO authenticated;
GRANT ALL ON public.rental_contract_items TO service_role;
ALTER TABLE public.rental_contract_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_contract_items_all" ON public.rental_contract_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rental_contracts c WHERE c.id = contract_id AND is_workspace_member(auth.uid(), c.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rental_contracts c WHERE c.id = contract_id AND is_workspace_member(auth.uid(), c.workspace_id)));

CREATE TABLE public.equipment_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  serial_number text NOT NULL,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','assigned','returned','broken','retired')),
  current_contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  current_client_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  returned_at timestamptz,
  purchase_date date,
  warranty_end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, serial_number)
);
CREATE INDEX idx_equipment_units_workspace ON public.equipment_units(workspace_id);
CREATE INDEX idx_equipment_units_product ON public.equipment_units(product_id);
CREATE INDEX idx_equipment_units_contract ON public.equipment_units(current_contract_id);
CREATE INDEX idx_equipment_units_client ON public.equipment_units(current_client_company_id);
CREATE INDEX idx_equipment_units_status ON public.equipment_units(workspace_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_units TO authenticated;
GRANT ALL ON public.equipment_units TO service_role;
ALTER TABLE public.equipment_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_units_select" ON public.equipment_units FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "equipment_units_insert" ON public.equipment_units FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "equipment_units_update" ON public.equipment_units FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "equipment_units_delete" ON public.equipment_units FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_equipment_units_updated_at BEFORE UPDATE ON public.equipment_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.equipment_unit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_unit_id uuid NOT NULL REFERENCES public.equipment_units(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','assigned','returned','invoiced','broken','repaired','retired','transferred','note')),
  contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  from_client_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  to_client_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_equipment_unit_history_unit ON public.equipment_unit_history(equipment_unit_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.equipment_unit_history TO authenticated;
GRANT ALL ON public.equipment_unit_history TO service_role;
ALTER TABLE public.equipment_unit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_unit_history_select" ON public.equipment_unit_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equipment_units u WHERE u.id = equipment_unit_id AND is_workspace_member(auth.uid(), u.workspace_id)));
CREATE POLICY "equipment_unit_history_insert" ON public.equipment_unit_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.equipment_units u WHERE u.id = equipment_unit_id AND is_workspace_member(auth.uid(), u.workspace_id)));

CREATE TABLE public.rental_contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.rental_contracts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_contract_events_contract ON public.rental_contract_events(contract_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.rental_contract_events TO authenticated;
GRANT ALL ON public.rental_contract_events TO service_role;
ALTER TABLE public.rental_contract_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_contract_events_select" ON public.rental_contract_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rental_contracts c WHERE c.id = contract_id AND is_workspace_member(auth.uid(), c.workspace_id)));
CREATE POLICY "rental_contract_events_insert" ON public.rental_contract_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rental_contracts c WHERE c.id = contract_id AND is_workspace_member(auth.uid(), c.workspace_id)));

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rental_contract_id uuid REFERENCES public.rental_contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_rental_contract ON public.invoices(rental_contract_id);

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS serial_numbers text[] DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.generate_rental_contract_number(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_next int;
  v_number text;
BEGIN
  SELECT COALESCE(MAX( (regexp_match(contract_number, '^RNT-' || v_year || '-(\d+)$'))[1]::int ), 0) + 1
    INTO v_next
    FROM public.rental_contracts
   WHERE workspace_id = p_workspace_id
     AND contract_number LIKE 'RNT-' || v_year || '-%';
  v_number := 'RNT-' || v_year || '-' || lpad(v_next::text, 4, '0');
  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_rental_contract_number(uuid) TO authenticated, service_role;
