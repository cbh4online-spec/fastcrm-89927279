-- ============================================
-- TABELAS DE CONFIGURAÇÃO FLEXÍVEIS PARA PRODUTOS
-- ============================================

-- 1. PAYMENT CONDITIONS - Condições de Pagamento
-- ============================================
CREATE TABLE public.payment_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  days INTEGER DEFAULT 0,
  discount_pct NUMERIC(5,2),
  icon TEXT DEFAULT 'Clock',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE public.payment_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment_conditions in their workspace"
  ON public.payment_conditions FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert payment_conditions in their workspace"
  ON public.payment_conditions FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update payment_conditions in their workspace"
  ON public.payment_conditions FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete payment_conditions in their workspace"
  ON public.payment_conditions FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE INDEX idx_payment_conditions_workspace ON public.payment_conditions(workspace_id);
CREATE INDEX idx_payment_conditions_active ON public.payment_conditions(workspace_id, is_active);

-- 2. PAYMENT METHODS - Métodos de Pagamento
-- ============================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'CreditCard',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment_methods in their workspace"
  ON public.payment_methods FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert payment_methods in their workspace"
  ON public.payment_methods FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update payment_methods in their workspace"
  ON public.payment_methods FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete payment_methods in their workspace"
  ON public.payment_methods FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE INDEX idx_payment_methods_workspace ON public.payment_methods(workspace_id);
CREATE INDEX idx_payment_methods_active ON public.payment_methods(workspace_id, is_active);

-- 3. CONSUMPTION MODELS - Modelos de Consumo
-- ============================================
CREATE TABLE public.consumption_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_trackable BOOLEAN DEFAULT true,
  unit_name TEXT,
  icon TEXT DEFAULT 'Activity',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE public.consumption_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consumption_models in their workspace"
  ON public.consumption_models FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert consumption_models in their workspace"
  ON public.consumption_models FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update consumption_models in their workspace"
  ON public.consumption_models FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete consumption_models in their workspace"
  ON public.consumption_models FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE INDEX idx_consumption_models_workspace ON public.consumption_models(workspace_id);
CREATE INDEX idx_consumption_models_active ON public.consumption_models(workspace_id, is_active);

-- 4. DELIVERY MODES - Modos de Entrega
-- ============================================
CREATE TABLE public.delivery_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Truck',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE public.delivery_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery_modes in their workspace"
  ON public.delivery_modes FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert delivery_modes in their workspace"
  ON public.delivery_modes FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update delivery_modes in their workspace"
  ON public.delivery_modes FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete delivery_modes in their workspace"
  ON public.delivery_modes FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE INDEX idx_delivery_modes_workspace ON public.delivery_modes(workspace_id);
CREATE INDEX idx_delivery_modes_active ON public.delivery_modes(workspace_id, is_active);

-- 5. BILLING FREQUENCIES - Frequências de Cobrança
-- ============================================
CREATE TABLE public.billing_frequencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  interval_days INTEGER NOT NULL,
  icon TEXT DEFAULT 'Calendar',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, code)
);

ALTER TABLE public.billing_frequencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view billing_frequencies in their workspace"
  ON public.billing_frequencies FOR SELECT
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can insert billing_frequencies in their workspace"
  ON public.billing_frequencies FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can update billing_frequencies in their workspace"
  ON public.billing_frequencies FOR UPDATE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users can delete billing_frequencies in their workspace"
  ON public.billing_frequencies FOR DELETE
  USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE INDEX idx_billing_frequencies_workspace ON public.billing_frequencies(workspace_id);
CREATE INDEX idx_billing_frequencies_active ON public.billing_frequencies(workspace_id, is_active);

-- ============================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================
CREATE TRIGGER update_payment_conditions_updated_at
  BEFORE UPDATE ON public.payment_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consumption_models_updated_at
  BEFORE UPDATE ON public.consumption_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_modes_updated_at
  BEFORE UPDATE ON public.delivery_modes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_frequencies_updated_at
  BEFORE UPDATE ON public.billing_frequencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ADICIONAR NOVOS TIPOS DE PRODUTO À TABELA EXISTENTE
-- ============================================
-- Nota: Os defaults serão inseridos via hook no frontend quando não existirem dados