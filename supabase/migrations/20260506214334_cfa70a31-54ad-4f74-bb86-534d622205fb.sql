
-- =========================================================
-- FASE 1K.1 — Inteligência Comercial WhatsApp (Fundações)
-- =========================================================

-- 1) ESTENDER whatsapp_product_shares
ALTER TABLE public.whatsapp_product_shares
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS deal_id uuid,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_reply_message_id uuid,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS revenue_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS margin_amount numeric,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'conversation',
  ADD COLUMN IF NOT EXISTS reply_classification text,
  ADD COLUMN IF NOT EXISTS reply_sentiment text,
  ADD COLUMN IF NOT EXISTS reply_intent text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_wps_workspace_status ON public.whatsapp_product_shares(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_wps_conversation ON public.whatsapp_product_shares(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wps_product ON public.whatsapp_product_shares(product_id);
CREATE INDEX IF NOT EXISTS idx_wps_deal ON public.whatsapp_product_shares(deal_id);
CREATE INDEX IF NOT EXISTS idx_wps_sent_at ON public.whatsapp_product_shares(sent_at DESC);

DROP TRIGGER IF EXISTS trg_wps_updated_at ON public.whatsapp_product_shares;
CREATE TRIGGER trg_wps_updated_at
  BEFORE UPDATE ON public.whatsapp_product_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) ESTENDER product_recommendations (canal WhatsApp)
ALTER TABLE public.product_recommendations
  ADD COLUMN IF NOT EXISTS conversation_id uuid,
  ADD COLUMN IF NOT EXISTS product_share_id uuid,
  ADD COLUMN IF NOT EXISTS recommendation_type text;

CREATE INDEX IF NOT EXISTS idx_prec_conversation ON public.product_recommendations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_prec_share ON public.product_recommendations(product_share_id);

-- 3) ESTENDER opportunities (atribuição WhatsApp)
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS source_conversation_id uuid,
  ADD COLUMN IF NOT EXISTS source_product_share_id uuid,
  ADD COLUMN IF NOT EXISTS source_product_id uuid;

CREATE INDEX IF NOT EXISTS idx_opp_source_share ON public.opportunities(source_product_share_id);
CREATE INDEX IF NOT EXISTS idx_opp_source_conv ON public.opportunities(source_conversation_id);

-- 4) ESTENDER objection_library (ligar a produto)
ALTER TABLE public.objection_library
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS product_share_id uuid;

CREATE INDEX IF NOT EXISTS idx_obj_product ON public.objection_library(product_id);

-- 5) NOVA: whatsapp_product_share_responses
CREATE TABLE IF NOT EXISTS public.whatsapp_product_share_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  product_share_id uuid NOT NULL REFERENCES public.whatsapp_product_shares(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  contact_id uuid,
  message_id uuid NOT NULL,
  classification text,
  sentiment text,
  intent text,
  ai_summary text,
  confidence numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wpsr_share ON public.whatsapp_product_share_responses(product_share_id);
CREATE INDEX IF NOT EXISTS idx_wpsr_workspace ON public.whatsapp_product_share_responses(workspace_id, created_at DESC);
ALTER TABLE public.whatsapp_product_share_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wpsr_select_workspace" ON public.whatsapp_product_share_responses
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "wpsr_insert_workspace" ON public.whatsapp_product_share_responses
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 6) NOVA: product_share_clicks
CREATE TABLE IF NOT EXISTS public.product_share_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  product_share_id uuid NOT NULL REFERENCES public.whatsapp_product_shares(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  contact_id uuid,
  conversation_id uuid,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text,
  referrer text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_psc_share ON public.product_share_clicks(product_share_id);
CREATE INDEX IF NOT EXISTS idx_psc_workspace ON public.product_share_clicks(workspace_id, clicked_at DESC);
ALTER TABLE public.product_share_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psc_select_workspace" ON public.product_share_clicks
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
-- INSERT é feito pela edge function pública via service_role (bypassa RLS), por isso não precisa de policy de insert para utilizadores.

-- 7) NOVA: revenue_leaks
CREATE TABLE IF NOT EXISTS public.revenue_leaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  leak_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  conversation_id uuid,
  contact_id uuid,
  product_share_id uuid,
  product_id uuid,
  agent_id uuid,
  estimated_value numeric,
  currency text DEFAULT 'EUR',
  title text NOT NULL,
  description text,
  recommended_action text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_rl_workspace_status ON public.revenue_leaks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_rl_severity ON public.revenue_leaks(severity);
ALTER TABLE public.revenue_leaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rl_select_workspace" ON public.revenue_leaks
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "rl_insert_workspace" ON public.revenue_leaks
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "rl_update_workspace" ON public.revenue_leaks
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_rl_updated_at ON public.revenue_leaks;
CREATE TRIGGER trg_rl_updated_at
  BEFORE UPDATE ON public.revenue_leaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) NOVA: product_conversation_faqs
CREATE TABLE IF NOT EXISTS public.product_conversation_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  product_id uuid NOT NULL,
  question text NOT NULL,
  suggested_answer text,
  frequency_count integer NOT NULL DEFAULT 1,
  source_conversation_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pcf_workspace_product ON public.product_conversation_faqs(workspace_id, product_id);
ALTER TABLE public.product_conversation_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcf_select_workspace" ON public.product_conversation_faqs
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "pcf_insert_workspace" ON public.product_conversation_faqs
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "pcf_update_workspace" ON public.product_conversation_faqs
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_pcf_updated_at ON public.product_conversation_faqs;
CREATE TRIGGER trg_pcf_updated_at
  BEFORE UPDATE ON public.product_conversation_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9) RPC: mark_product_share_converted
CREATE OR REPLACE FUNCTION public.mark_product_share_converted(
  p_share_id uuid,
  p_revenue numeric,
  p_currency text DEFAULT 'EUR',
  p_margin numeric DEFAULT NULL,
  p_create_opportunity boolean DEFAULT false,
  p_opportunity_title text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share record;
  v_user uuid := auth.uid();
  v_is_member boolean;
  v_opp_id uuid;
BEGIN
  SELECT * INTO v_share FROM public.whatsapp_product_shares WHERE id = p_share_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_share_not_found';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id = v_share.workspace_id AND user_id = v_user)
    INTO v_is_member;
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.whatsapp_product_shares
  SET status = 'converted',
      converted_at = now(),
      revenue_amount = p_revenue,
      currency = COALESCE(p_currency, currency, 'EUR'),
      margin_amount = COALESCE(p_margin, margin_amount),
      metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('conversion_note', p_note)
  WHERE id = p_share_id;

  IF p_create_opportunity AND v_share.deal_id IS NULL THEN
    INSERT INTO public.opportunities (
      workspace_id, title, value, currency, status, source,
      contact_id, lead_id,
      source_conversation_id, source_product_share_id, source_product_id,
      owner_id
    ) VALUES (
      v_share.workspace_id,
      COALESCE(p_opportunity_title, 'Oportunidade WhatsApp'),
      p_revenue,
      COALESCE(p_currency, 'EUR'),
      'won',
      'whatsapp',
      v_share.contact_id,
      v_share.lead_id,
      v_share.conversation_id,
      v_share.id,
      v_share.product_id,
      COALESCE(v_share.agent_id, v_user)
    )
    RETURNING id INTO v_opp_id;

    UPDATE public.whatsapp_product_shares
    SET deal_id = v_opp_id
    WHERE id = p_share_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'share_id', p_share_id, 'opportunity_id', v_opp_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_product_share_converted TO authenticated;
