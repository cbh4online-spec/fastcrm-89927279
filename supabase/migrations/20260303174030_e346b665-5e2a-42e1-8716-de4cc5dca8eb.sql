
-- ============================================
-- Renewal Contracts Module — Complete Schema
-- ============================================

-- Enums
DO $$ BEGIN CREATE TYPE public.renewal_source_type AS ENUM ('proposal', 'order', 'opportunity', 'manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_contract_status AS ENUM ('active', 'paused', 'cancelled', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_billing_type AS ENUM ('invoice', 'stripe', 'external'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_interval_type AS ENUM ('monthly', 'quarterly', 'semi_annual', 'yearly', 'custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_item_type AS ENUM ('domain', 'software_license', 'hours_pack', 'retainer', 'subscription'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_pricing_model AS ENUM ('fixed', 'per_seat', 'per_unit', 'usage', 'hybrid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_item_status AS ENUM ('active', 'pending_renewal', 'overdue', 'cancelled', 'expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_usage_type AS ENUM ('hours', 'credits', 'seats_addon'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.renewal_event_type AS ENUM ('created', 'renewal_due', 'renewed', 'invoice_sent', 'payment_received', 'overdue', 'consumption_logged', 'paused', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. renewal_contracts
CREATE TABLE public.renewal_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  source_type public.renewal_source_type NOT NULL DEFAULT 'manual',
  source_id text,
  status public.renewal_contract_status NOT NULL DEFAULT 'active',
  billing_type public.renewal_billing_type NOT NULL DEFAULT 'invoice',
  currency text NOT NULL DEFAULT 'EUR',
  payment_terms_days integer,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  next_renewal_date date,
  renewal_interval public.renewal_interval_type NOT NULL DEFAULT 'yearly',
  auto_renew boolean NOT NULL DEFAULT true,
  owner_user_id uuid,
  notes text,
  health_score integer NOT NULL DEFAULT 100,
  total_mrr numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_contracts_workspace ON public.renewal_contracts(workspace_id);
CREATE INDEX idx_renewal_contracts_company ON public.renewal_contracts(company_id);
CREATE INDEX idx_renewal_contracts_next_renewal ON public.renewal_contracts(next_renewal_date);
CREATE INDEX idx_renewal_contracts_status ON public.renewal_contracts(status);

ALTER TABLE public.renewal_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view renewal contracts" ON public.renewal_contracts FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can insert renewal contracts" ON public.renewal_contracts FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can update renewal contracts" ON public.renewal_contracts FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can delete renewal contracts" ON public.renewal_contracts FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER set_renewal_contracts_updated_at BEFORE UPDATE ON public.renewal_contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. renewal_items
CREATE TABLE public.renewal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.renewal_contracts(id) ON DELETE CASCADE,
  item_type public.renewal_item_type NOT NULL DEFAULT 'subscription',
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  pricing_model public.renewal_pricing_model NOT NULL DEFAULT 'fixed',
  renewal_interval public.renewal_interval_type NOT NULL DEFAULT 'yearly',
  next_renewal_date date,
  end_date date,
  grace_period_days integer NOT NULL DEFAULT 7,
  status public.renewal_item_status NOT NULL DEFAULT 'active',
  meta_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_items_contract ON public.renewal_items(contract_id);
CREATE INDEX idx_renewal_items_workspace ON public.renewal_items(workspace_id);
CREATE INDEX idx_renewal_items_next_renewal ON public.renewal_items(next_renewal_date);

ALTER TABLE public.renewal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view renewal items" ON public.renewal_items FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can insert renewal items" ON public.renewal_items FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can update renewal items" ON public.renewal_items FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can delete renewal items" ON public.renewal_items FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER set_renewal_items_updated_at BEFORE UPDATE ON public.renewal_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. renewal_usage_ledger
CREATE TABLE public.renewal_usage_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.renewal_contracts(id) ON DELETE CASCADE,
  renewal_item_id uuid NOT NULL REFERENCES public.renewal_items(id) ON DELETE CASCADE,
  usage_type public.renewal_usage_type NOT NULL DEFAULT 'hours',
  amount numeric(10,2) NOT NULL,
  unit text NOT NULL DEFAULT 'hours',
  source_type text DEFAULT 'manual',
  source_id text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_usage_ledger_item ON public.renewal_usage_ledger(renewal_item_id);
CREATE INDEX idx_renewal_usage_ledger_contract ON public.renewal_usage_ledger(contract_id);

ALTER TABLE public.renewal_usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view usage ledger" ON public.renewal_usage_ledger FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can insert usage ledger" ON public.renewal_usage_ledger FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can update usage ledger" ON public.renewal_usage_ledger FOR UPDATE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can delete usage ledger" ON public.renewal_usage_ledger FOR DELETE USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- 4. renewal_events
CREATE TABLE public.renewal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.renewal_contracts(id) ON DELETE CASCADE,
  event_type public.renewal_event_type NOT NULL,
  payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_renewal_events_contract ON public.renewal_events(contract_id);

ALTER TABLE public.renewal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view renewal events" ON public.renewal_events FOR SELECT USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Members can insert renewal events" ON public.renewal_events FOR INSERT WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.renewal_events;
