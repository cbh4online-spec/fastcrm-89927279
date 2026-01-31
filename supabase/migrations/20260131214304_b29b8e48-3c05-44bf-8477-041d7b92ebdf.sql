-- =====================================================
-- MÓDULO DE NOTA DE ENCOMENDA PROFISSIONAL
-- Tabelas: client_users, order_notes, order_note_items, product_attributes
-- =====================================================

-- Enum para status de cliente
CREATE TYPE public.client_user_status AS ENUM ('active', 'suspended', 'pending');

-- Enum para status de nota de encomenda
CREATE TYPE public.order_note_status AS ENUM (
  'draft', 
  'submitted', 
  'awaiting_approval',
  'approved', 
  'rejected',
  'in_preparation', 
  'invoiced', 
  'cancelled'
);

-- Enum para tipo de atributo de produto
CREATE TYPE public.product_attribute_type AS ENUM (
  'function', 
  'pathology', 
  'indication', 
  'protocol'
);

-- =====================================================
-- TABELA: client_users (Clientes B2B)
-- =====================================================
CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  tax_id TEXT,
  billing_address JSONB DEFAULT '{}',
  shipping_address JSONB DEFAULT '{}',
  credit_limit NUMERIC(12,2) DEFAULT 0,
  payment_terms TEXT DEFAULT '30 dias',
  status public.client_user_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id, workspace_id)
);

-- Índices para client_users
CREATE INDEX idx_client_users_workspace ON public.client_users(workspace_id);
CREATE INDEX idx_client_users_auth ON public.client_users(auth_user_id);
CREATE INDEX idx_client_users_contact ON public.client_users(contact_id);
CREATE INDEX idx_client_users_company ON public.client_users(company_id);
CREATE INDEX idx_client_users_status ON public.client_users(status);

-- =====================================================
-- TABELA: order_notes (Notas de Encomenda)
-- =====================================================
CREATE TABLE public.order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status public.order_note_status DEFAULT 'draft',
  total_net NUMERIC(12,2) DEFAULT 0,
  total_vat NUMERIC(12,2) DEFAULT 0,
  total_gross NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  installment_requested BOOLEAN DEFAULT false,
  installment_count INTEGER DEFAULT 1,
  installment_notes TEXT,
  client_notes TEXT,
  admin_notes TEXT,
  billing_address JSONB DEFAULT '{}',
  shipping_address JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, order_number)
);

-- Índices para order_notes
CREATE INDEX idx_order_notes_workspace ON public.order_notes(workspace_id);
CREATE INDEX idx_order_notes_client ON public.order_notes(client_user_id);
CREATE INDEX idx_order_notes_status ON public.order_notes(status);
CREATE INDEX idx_order_notes_number ON public.order_notes(order_number);
CREATE INDEX idx_order_notes_submitted ON public.order_notes(submitted_at DESC);

-- =====================================================
-- TABELA: order_note_items (Itens da Encomenda)
-- =====================================================
CREATE TABLE public.order_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_note_id UUID NOT NULL REFERENCES public.order_notes(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_net NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 23.00,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  line_total_net NUMERIC(12,2) DEFAULT 0,
  line_total_gross NUMERIC(12,2) DEFAULT 0,
  position INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para order_note_items
CREATE INDEX idx_order_note_items_order ON public.order_note_items(order_note_id);
CREATE INDEX idx_order_note_items_workspace ON public.order_note_items(workspace_id);
CREATE INDEX idx_order_note_items_product ON public.order_note_items(product_id);

-- =====================================================
-- TABELA: product_attributes (Atributos Técnicos/Clínicos)
-- =====================================================
CREATE TABLE public.product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_type public.product_attribute_type NOT NULL,
  attribute_value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para product_attributes
CREATE INDEX idx_product_attributes_workspace ON public.product_attributes(workspace_id);
CREATE INDEX idx_product_attributes_product ON public.product_attributes(product_id);
CREATE INDEX idx_product_attributes_type ON public.product_attributes(attribute_type);
CREATE UNIQUE INDEX idx_product_attributes_unique ON public.product_attributes(product_id, attribute_type, attribute_value);

-- =====================================================
-- FUNÇÃO: Gerar número de encomenda sequencial
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_order_note_number(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Get next sequence for this workspace and year
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM order_notes
  WHERE workspace_id = p_workspace_id
    AND order_number LIKE 'NE-' || v_year || '-%';
  
  v_number := 'NE-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
  
  RETURN v_number;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-generate order number on insert
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_order_note_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_note_number(NEW.workspace_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_order_note_number
  BEFORE INSERT ON public.order_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_note_number();

-- =====================================================
-- TRIGGER: Recalcular totais dos itens
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_order_note_item_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate line totals
  NEW.line_total_net := NEW.quantity * NEW.unit_price_net;
  NEW.vat_amount := NEW.line_total_net * (NEW.vat_rate / 100);
  NEW.line_total_gross := NEW.line_total_net + NEW.vat_amount;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_item_totals
  BEFORE INSERT OR UPDATE ON public.order_note_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_order_note_item_totals();

-- =====================================================
-- TRIGGER: Recalcular totais da encomenda
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_order_note_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  -- Determine which order to update
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_note_id;
  ELSE
    v_order_id := NEW.order_note_id;
  END IF;
  
  -- Update order totals
  UPDATE order_notes
  SET 
    total_net = COALESCE((SELECT SUM(line_total_net) FROM order_note_items WHERE order_note_id = v_order_id), 0),
    total_vat = COALESCE((SELECT SUM(vat_amount) FROM order_note_items WHERE order_note_id = v_order_id), 0),
    total_gross = COALESCE((SELECT SUM(line_total_gross) FROM order_note_items WHERE order_note_id = v_order_id), 0),
    updated_at = now()
  WHERE id = v_order_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_note_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_note_totals();

-- =====================================================
-- TRIGGER: updated_at automático
-- =====================================================
CREATE TRIGGER update_client_users_updated_at
  BEFORE UPDATE ON public.client_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_notes_updated_at
  BEFORE UPDATE ON public.order_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: client_users
-- =====================================================

-- Super admin full access
CREATE POLICY "client_users_super_admin_all" ON public.client_users
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Workspace members can manage client users
CREATE POLICY "client_users_workspace_members_select" ON public.client_users
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "client_users_workspace_admins_all" ON public.client_users
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agent')
    )
  );

-- Client can view own profile
CREATE POLICY "client_users_own_select" ON public.client_users
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "client_users_own_update" ON public.client_users
  FOR UPDATE USING (auth_user_id = auth.uid());

-- =====================================================
-- RLS: order_notes
-- =====================================================

-- Super admin full access
CREATE POLICY "order_notes_super_admin_all" ON public.order_notes
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Workspace members can view all orders
CREATE POLICY "order_notes_workspace_select" ON public.order_notes
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace admins can manage orders
CREATE POLICY "order_notes_workspace_admins_all" ON public.order_notes
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agent')
    )
  );

-- Client can view and create own orders
CREATE POLICY "order_notes_client_select" ON public.order_notes
  FOR SELECT USING (
    client_user_id IN (
      SELECT id FROM public.client_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "order_notes_client_insert" ON public.order_notes
  FOR INSERT WITH CHECK (
    client_user_id IN (
      SELECT id FROM public.client_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "order_notes_client_update" ON public.order_notes
  FOR UPDATE USING (
    client_user_id IN (
      SELECT id FROM public.client_users WHERE auth_user_id = auth.uid()
    )
    AND status IN ('draft', 'submitted')
  );

-- =====================================================
-- RLS: order_note_items
-- =====================================================

-- Super admin full access
CREATE POLICY "order_note_items_super_admin_all" ON public.order_note_items
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Workspace members can view items
CREATE POLICY "order_note_items_workspace_select" ON public.order_note_items
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace admins can manage items
CREATE POLICY "order_note_items_workspace_admins_all" ON public.order_note_items
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agent')
    )
  );

-- Client can manage items in own draft orders
CREATE POLICY "order_note_items_client_select" ON public.order_note_items
  FOR SELECT USING (
    order_note_id IN (
      SELECT on2.id FROM public.order_notes on2
      JOIN public.client_users cu ON cu.id = on2.client_user_id
      WHERE cu.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "order_note_items_client_insert" ON public.order_note_items
  FOR INSERT WITH CHECK (
    order_note_id IN (
      SELECT on2.id FROM public.order_notes on2
      JOIN public.client_users cu ON cu.id = on2.client_user_id
      WHERE cu.auth_user_id = auth.uid() AND on2.status = 'draft'
    )
  );

CREATE POLICY "order_note_items_client_update" ON public.order_note_items
  FOR UPDATE USING (
    order_note_id IN (
      SELECT on2.id FROM public.order_notes on2
      JOIN public.client_users cu ON cu.id = on2.client_user_id
      WHERE cu.auth_user_id = auth.uid() AND on2.status = 'draft'
    )
  );

CREATE POLICY "order_note_items_client_delete" ON public.order_note_items
  FOR DELETE USING (
    order_note_id IN (
      SELECT on2.id FROM public.order_notes on2
      JOIN public.client_users cu ON cu.id = on2.client_user_id
      WHERE cu.auth_user_id = auth.uid() AND on2.status = 'draft'
    )
  );

-- =====================================================
-- RLS: product_attributes
-- =====================================================

-- Super admin full access
CREATE POLICY "product_attributes_super_admin_all" ON public.product_attributes
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Workspace members can view
CREATE POLICY "product_attributes_workspace_select" ON public.product_attributes
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace admins can manage
CREATE POLICY "product_attributes_workspace_admins_all" ON public.product_attributes
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Client users can view product attributes
CREATE POLICY "product_attributes_client_select" ON public.product_attributes
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.client_users WHERE auth_user_id = auth.uid()
    )
  );