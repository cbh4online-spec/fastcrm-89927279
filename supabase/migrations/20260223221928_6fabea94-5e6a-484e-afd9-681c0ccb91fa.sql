
-- =============================================
-- ACTIVITY LOGS: Global Audit System
-- =============================================

-- 1. Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id uuid,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  module text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes for performance
CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs(workspace_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_table_name ON public.activity_logs(table_name);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_module ON public.activity_logs(module);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);

-- 3. RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Workspace members can view their workspace logs"
  ON public.activity_logs FOR SELECT
  USING (
    workspace_id IN (
      SELECT w.id FROM public.workspaces w
      INNER JOIN public.workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Insert policy for the trigger function (runs as SECURITY DEFINER)
CREATE POLICY "System can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- 4. Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_record_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed text[];
  v_module text;
  v_action text;
  v_key text;
  v_sensitive_fields text[] := ARRAY['password_hash', 'token', 'api_key', 'secret', 'access_token', 'refresh_token'];
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Determine action
  v_action := TG_OP;
  
  -- Get record data
  IF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_record_id := OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id;
    
    -- Calculate changed fields
    v_changed := ARRAY(
      SELECT key FROM jsonb_each(v_new_data) AS n(key, value)
      WHERE NOT v_old_data ? key OR v_old_data->key IS DISTINCT FROM v_new_data->key
    );
    
    -- Skip if only updated_at changed
    IF v_changed = ARRAY['updated_at'] THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;
  
  -- Remove sensitive fields
  FOREACH v_key IN ARRAY v_sensitive_fields LOOP
    v_old_data := v_old_data - v_key;
    v_new_data := v_new_data - v_key;
  END LOOP;
  
  -- Extract workspace_id
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_workspace_id := (v_new_data->>'workspace_id')::uuid;
  ELSE
    v_workspace_id := (v_old_data->>'workspace_id')::uuid;
  END IF;
  
  -- Map table to module
  v_module := CASE TG_TABLE_NAME
    WHEN 'leads' THEN 'CRM - Leads'
    WHEN 'contacts' THEN 'CRM - Contactos'
    WHEN 'companies' THEN 'CRM - Empresas'
    WHEN 'opportunities' THEN 'CRM - Oportunidades'
    WHEN 'pipeline_stages' THEN 'CRM - Oportunidades'
    WHEN 'tasks' THEN 'Produtividade - Tarefas'
    WHEN 'meetings' THEN 'Agenda'
    WHEN 'calendar_events' THEN 'Agenda'
    WHEN 'conversations' THEN 'Inbox'
    WHEN 'messages' THEN 'Inbox'
    WHEN 'products' THEN 'Produtos'
    WHEN 'product_categories' THEN 'Produtos'
    WHEN 'invoices' THEN 'Facturação'
    WHEN 'invoice_items' THEN 'Facturação'
    WHEN 'order_notes' THEN 'Notas de Encomenda'
    WHEN 'order_note_items' THEN 'Notas de Encomenda'
    WHEN 'proposals' THEN 'Propostas'
    WHEN 'proposal_items' THEN 'Propostas'
    WHEN 'email_campaigns' THEN 'Marketing - Email'
    WHEN 'email_templates' THEN 'Marketing - Email'
    WHEN 'automations' THEN 'Automações'
    WHEN 'automation_rules' THEN 'Automações'
    WHEN 'automation_actions' THEN 'Automações'
    WHEN 'workflows' THEN 'Workflows'
    WHEN 'workflow_executions' THEN 'Workflows'
    WHEN 'bio_pages' THEN 'Bio Pages'
    WHEN 'bio_blocks' THEN 'Bio Pages'
    WHEN 'store_orders' THEN 'Loja Online'
    WHEN 'store_products' THEN 'Loja Online'
    WHEN 'c2c_listings' THEN 'Marketplace C2C'
    WHEN 'c2c_offers' THEN 'Marketplace C2C'
    WHEN 'community_channels' THEN 'Comunidade'
    WHEN 'community_posts' THEN 'Comunidade'
    WHEN 'ai_personas' THEN 'IA - Motor Conversacional'
    WHEN 'knowledge_bases' THEN 'IA - Motor Conversacional'
    WHEN 'ai_agents' THEN 'IA - Agentes'
    WHEN 'documents' THEN 'Document Intelligence'
    WHEN 'document_processing_jobs' THEN 'Document Intelligence'
    WHEN 'funnels' THEN 'Funis'
    WHEN 'funnel_steps' THEN 'Funis'
    WHEN 'subscription_plans' THEN 'Subscrições'
    WHEN 'subscriptions' THEN 'Subscrições'
    WHEN 'workspace_members' THEN 'Workspace Config'
    WHEN 'workspace_settings' THEN 'Workspace Config'
    WHEN 'custom_fields' THEN 'Configuração'
    WHEN 'managed_fields' THEN 'Configuração'
    ELSE 'Outro - ' || TG_TABLE_NAME
  END;
  
  -- Insert log
  INSERT INTO public.activity_logs (workspace_id, user_id, table_name, record_id, action, old_data, new_data, changed_fields, module)
  VALUES (v_workspace_id, v_user_id, TG_TABLE_NAME, v_record_id, v_action, v_old_data, v_new_data, v_changed, v_module);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Apply triggers to all relevant tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'leads', 'contacts', 'companies', 'opportunities', 'pipeline_stages',
    'tasks', 'meetings', 'calendar_events',
    'conversations', 'messages',
    'products', 'product_categories',
    'invoices', 'invoice_items',
    'order_notes', 'order_note_items',
    'proposals', 'proposal_items',
    'email_campaigns', 'email_templates',
    'automations', 'automation_rules', 'automation_actions',
    'workflows', 'workflow_executions',
    'bio_pages', 'bio_blocks',
    'store_orders', 'store_products',
    'c2c_listings', 'c2c_offers',
    'community_channels', 'community_posts',
    'ai_personas', 'knowledge_bases',
    'ai_agents',
    'documents', 'document_processing_jobs',
    'funnels', 'funnel_steps',
    'subscription_plans', 'subscriptions',
    'workspace_members', 'workspace_settings',
    'custom_fields', 'managed_fields'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Only create trigger if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('
        CREATE TRIGGER audit_%I
        AFTER INSERT OR UPDATE OR DELETE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function()
      ', t, t);
    END IF;
  END LOOP;
END;
$$;

-- 6. Retention: function to clean old logs
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_logs WHERE created_at < now() - interval '90 days';
END;
$$;
