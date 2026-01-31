-- =====================================================
-- FASE 2: CONTROLO OPERACIONAL - Extensões à tabela products
-- =====================================================

-- Enum para status de stock (verificar se já existe)
DO $$ BEGIN
  CREATE TYPE public.stock_status AS ENUM (
    'available',
    'limited', 
    'backorder',
    'out_of_stock'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Extensão da tabela products com campos de controlo operacional
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stock_status public.stock_status DEFAULT 'available',
ADD COLUMN IF NOT EXISTS stock_notes text,
ADD COLUMN IF NOT EXISTS min_order_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS order_multiple integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS pack_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS delivery_estimate text DEFAULT '24-48h',
ADD COLUMN IF NOT EXISTS delivery_notes text;

-- Comentários para documentação
COMMENT ON COLUMN public.products.stock_status IS 'Status informativo de stock: available, limited, backorder, out_of_stock';
COMMENT ON COLUMN public.products.stock_notes IS 'Notas adicionais sobre stock (ex: previsão de reposição)';
COMMENT ON COLUMN public.products.min_order_quantity IS 'Quantidade mínima de encomenda (MOQ)';
COMMENT ON COLUMN public.products.order_multiple IS 'Múltiplo obrigatório (ex: vende-se em múltiplos de 6)';
COMMENT ON COLUMN public.products.pack_size IS 'Tamanho do pack/caixa';
COMMENT ON COLUMN public.products.delivery_estimate IS 'Prazo estimado de entrega (ex: 24-48h, 5-7 dias)';
COMMENT ON COLUMN public.products.delivery_notes IS 'Notas adicionais sobre entrega';

-- =====================================================
-- FASE 3: CENTRO DE APROVAÇÕES E GOVERNAÇÃO
-- =====================================================

-- Tabela de auditoria de alterações em order_notes
CREATE TABLE public.order_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_note_id uuid NOT NULL REFERENCES public.order_notes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_fields text[],
  user_id uuid,
  user_email text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_order_audit_log_order ON public.order_audit_log(order_note_id);
CREATE INDEX idx_order_audit_log_workspace ON public.order_audit_log(workspace_id);
CREATE INDEX idx_order_audit_log_created ON public.order_audit_log(created_at DESC);
CREATE INDEX idx_order_audit_log_action ON public.order_audit_log(action);

-- RLS para order_audit_log
ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their workspace"
  ON public.order_audit_log
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert audit logs"
  ON public.order_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Tabela de workflows de transição de estados
CREATE TABLE public.order_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  status_from text NOT NULL,
  status_to text NOT NULL,
  is_active boolean DEFAULT true,
  actions jsonb DEFAULT '[]'::jsonb,
  conditions jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, status_from, status_to)
);

-- Comentários
COMMENT ON TABLE public.order_workflows IS 'Configuração de automações por transição de estado de encomenda';
COMMENT ON COLUMN public.order_workflows.actions IS 'Array de acções: send_email, create_task, notify, webhook';
COMMENT ON COLUMN public.order_workflows.conditions IS 'Condições adicionais para executar o workflow';

-- Índices
CREATE INDEX idx_order_workflows_workspace ON public.order_workflows(workspace_id);
CREATE INDEX idx_order_workflows_status ON public.order_workflows(status_from, status_to);

-- RLS para order_workflows
ALTER TABLE public.order_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows for their workspace"
  ON public.order_workflows
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage workflows"
  ON public.order_workflows
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_order_workflows_updated_at
  BEFORE UPDATE ON public.order_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar log de auditoria automático em order_notes
CREATE OR REPLACE FUNCTION public.log_order_note_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_cols text[];
  old_data jsonb;
  new_data jsonb;
BEGIN
  -- Determinar campos alterados
  IF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    
    -- Identificar campos que mudaram
    SELECT array_agg(key) INTO changed_cols
    FROM jsonb_each(new_data) n
    LEFT JOIN jsonb_each(old_data) o USING (key)
    WHERE n.value IS DISTINCT FROM o.value
      AND key NOT IN ('updated_at');
    
    -- Só registar se houve alterações significativas
    IF array_length(changed_cols, 1) > 0 THEN
      INSERT INTO public.order_audit_log (
        order_note_id,
        workspace_id,
        action,
        old_value,
        new_value,
        changed_fields,
        user_id
      ) VALUES (
        NEW.id,
        NEW.workspace_id,
        'update',
        old_data,
        new_data,
        changed_cols,
        auth.uid()
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_audit_log (
      order_note_id,
      workspace_id,
      action,
      new_value,
      user_id
    ) VALUES (
      NEW.id,
      NEW.workspace_id,
      'create',
      to_jsonb(NEW),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger
CREATE TRIGGER order_notes_audit_trigger
  AFTER INSERT OR UPDATE ON public.order_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_note_changes();

-- =====================================================
-- EXTENSÕES ADICIONAIS PARA FASES POSTERIORES
-- =====================================================

-- Extensão order_notes para integração CRM (Fase 4)
ALTER TABLE public.order_notes
ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL;

-- Extensão order_note_items para notas de protocolo (Fase 6)
ALTER TABLE public.order_note_items
ADD COLUMN IF NOT EXISTS protocol_notes text;

COMMENT ON COLUMN public.order_note_items.protocol_notes IS 'Observações do protocolo para picking e preparação';