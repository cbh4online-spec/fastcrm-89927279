
-- Table for broadcast messages
CREATE TABLE public.group_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  message TEXT,
  product_id UUID REFERENCES public.products(id),
  target_groups UUID[] NOT NULL DEFAULT '{}',
  sent_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.group_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view broadcasts" ON public.group_broadcasts
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can create broadcasts" ON public.group_broadcasts
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update broadcasts" ON public.group_broadcasts
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Function to notify telegram on new lead
CREATE OR REPLACE FUNCTION public.notify_telegram_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  -- Check if workspace has telegram config with lead notifications enabled
  SELECT * INTO v_config FROM telegram_config 
  WHERE workspace_id = NEW.workspace_id 
  AND notify_new_leads = true 
  AND alert_group_chat_id IS NOT NULL;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Call telegram-send via pg_net
  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/telegram-send';
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'action', 'sendAlertInternal',
      'workspace_id', NEW.workspace_id,
      'alert_type', 'new_lead',
      'text', '🎯 Novo Lead: ' || COALESCE(NEW.name, 'Sem nome') || E'\n📧 ' || COALESCE(NEW.email, 'N/A') || E'\n🏢 ' || COALESCE(NEW.company, 'N/A')
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_telegram_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram_new_lead();

-- Function to notify telegram on new opportunity
CREATE OR REPLACE FUNCTION public.notify_telegram_new_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_url TEXT;
  v_anon_key TEXT;
BEGIN
  SELECT * INTO v_config FROM telegram_config 
  WHERE workspace_id = NEW.workspace_id 
  AND notify_new_deals = true 
  AND alert_group_chat_id IS NOT NULL;

  IF NOT FOUND THEN RETURN NEW; END IF;

  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/telegram-send';
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'action', 'sendAlertInternal',
      'workspace_id', NEW.workspace_id,
      'alert_type', 'new_deal',
      'text', '💰 Nova Oportunidade: ' || COALESCE(NEW.title, 'Sem título') || E'\n💵 Valor: ' || COALESCE(NEW.value::text, 'N/A') || '€'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_telegram_new_deal
  AFTER INSERT ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram_new_deal();
