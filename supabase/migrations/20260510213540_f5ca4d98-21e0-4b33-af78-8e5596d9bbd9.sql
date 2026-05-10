-- ============================================
-- WhatsApp Campaigns (mass send) + Opt-outs
-- ============================================

CREATE TABLE IF NOT EXISTS public.whatsapp_optouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  phone text NOT NULL,
  reason text,
  source text NOT NULL DEFAULT 'auto_keyword',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_optouts_ws_phone ON public.whatsapp_optouts(workspace_id, phone);
ALTER TABLE public.whatsapp_optouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws members read optouts"
  ON public.whatsapp_optouts FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members insert optouts"
  ON public.whatsapp_optouts FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members delete optouts"
  ON public.whatsapp_optouts FOR DELETE TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid,
  name text NOT NULL,
  description text,
  message_type text NOT NULL DEFAULT 'text',
  message_text text,
  media_url text,
  media_mime_type text,
  cta_url text,
  cta_label text,
  product_id uuid,
  audience_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  throttle_per_minute integer NOT NULL DEFAULT 20,
  send_window_start time NOT NULL DEFAULT '09:00',
  send_window_end time NOT NULL DEFAULT '20:00',
  timezone text NOT NULL DEFAULT 'Europe/Lisbon',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  read_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  append_optout_footer boolean NOT NULL DEFAULT true,
  last_dispatched_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_campaigns_ws_status ON public.whatsapp_campaigns(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_campaigns_scheduled ON public.whatsapp_campaigns(status, scheduled_at) WHERE status IN ('scheduled','sending');
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws members read campaigns"
  ON public.whatsapp_campaigns FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members insert campaigns"
  ON public.whatsapp_campaigns FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members update campaigns"
  ON public.whatsapp_campaigns FOR UPDATE TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members delete campaigns"
  ON public.whatsapp_campaigns FOR DELETE TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL,
  contact_id uuid,
  phone text NOT NULL,
  contact_name text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  provider_message_id text,
  error_message text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_wa_recipients_campaign_status ON public.whatsapp_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_recipients_provider_msg ON public.whatsapp_campaign_recipients(provider_message_id) WHERE provider_message_id IS NOT NULL;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws members read recipients"
  ON public.whatsapp_campaign_recipients FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members insert recipients"
  ON public.whatsapp_campaign_recipients FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members update recipients"
  ON public.whatsapp_campaign_recipients FOR UPDATE TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ws members delete recipients"
  ON public.whatsapp_campaign_recipients FOR DELETE TO authenticated
  USING (is_workspace_member(workspace_id, auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_wa_campaigns_updated
  BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wa_recipients_updated
  BEFORE UPDATE ON public.whatsapp_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto opt-out detection from inbound messages
CREATE OR REPLACE FUNCTION public.detect_whatsapp_optout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_text text;
  v_phone text;
BEGIN
  IF NEW.direction <> 'inbound' THEN RETURN NEW; END IF;
  v_text := lower(coalesce(NEW.content, NEW.message_text, ''));
  v_phone := coalesce(NEW.from_phone, NEW.phone, NEW.contact_phone);
  IF v_phone IS NULL OR NEW.workspace_id IS NULL THEN RETURN NEW; END IF;
  IF v_text ~ '(^|\s)(stop|sair|cancelar|parar|unsubscribe|remove)(\s|$|\.|!|\?)' THEN
    INSERT INTO public.whatsapp_optouts (workspace_id, phone, reason, source)
    VALUES (NEW.workspace_id, v_phone, 'Inbound keyword: ' || left(v_text, 80), 'auto_keyword')
    ON CONFLICT (workspace_id, phone) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Helper: mark recipients as skipped if opted-out (called by dispatcher)
CREATE OR REPLACE FUNCTION public.skip_optout_recipients(p_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.whatsapp_campaign_recipients r
  SET status = 'skipped_optout', updated_at = now()
  WHERE r.campaign_id = p_campaign_id
    AND r.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.whatsapp_optouts o
      WHERE o.workspace_id = r.workspace_id AND o.phone = r.phone
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.whatsapp_campaigns
  SET skipped_count = skipped_count + v_count
  WHERE id = p_campaign_id;
  RETURN v_count;
END;
$$;