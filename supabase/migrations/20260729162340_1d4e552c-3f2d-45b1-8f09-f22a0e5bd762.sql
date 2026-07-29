CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  v_user_id := auth.uid();
  v_action := TG_OP;

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

    v_changed := ARRAY(
      SELECT key FROM jsonb_each(v_new_data) AS n(key, value)
      WHERE NOT v_old_data ? key OR v_old_data->key IS DISTINCT FROM v_new_data->key
    );

    IF v_changed = ARRAY['updated_at'] THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  FOREACH v_key IN ARRAY v_sensitive_fields LOOP
    v_old_data := v_old_data - v_key;
    v_new_data := v_new_data - v_key;
  END LOOP;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_workspace_id := (v_new_data->>'workspace_id')::uuid;
  ELSE
    v_workspace_id := (v_old_data->>'workspace_id')::uuid;
  END IF;

  -- Se o workspace já não existe (ex.: eliminação em cascata do workspace),
  -- não faz sentido registar o log e a FK falharia. Ignorar em silêncio.
  IF v_workspace_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = v_workspace_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

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

  INSERT INTO public.activity_logs (workspace_id, user_id, table_name, record_id, action, old_data, new_data, changed_fields, module)
  VALUES (v_workspace_id, v_user_id, TG_TABLE_NAME, v_record_id, v_action, v_old_data, v_new_data, v_changed, v_module);

  RETURN COALESCE(NEW, OLD);
END;
$function$;