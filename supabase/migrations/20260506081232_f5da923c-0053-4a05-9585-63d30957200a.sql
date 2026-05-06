
-- ============================================================
-- Fase 1E: Inbox Intelligence — insights persistidos + histórico
-- ============================================================

-- 1) whatsapp_conversation_insights (estado actual por conversa)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  conversation_id uuid NOT NULL UNIQUE,
  contact_id uuid NULL,
  lead_id uuid NULL,

  summary text NULL,
  intent text NULL,
  sentiment text NULL,
  urgency text NULL,
  conversation_stage text NULL,

  objections jsonb NOT NULL DEFAULT '[]'::jsonb,

  suggested_reply text NULL,
  suggested_next_action text NULL,
  suggested_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_task jsonb NULL,
  suggested_ticket jsonb NULL,
  suggested_deal jsonb NULL,
  suggested_tags jsonb NOT NULL DEFAULT '[]'::jsonb,

  confidence numeric NULL,
  analyzed_message_count integer NULL,
  last_message_id uuid NULL,
  raw_ai_response jsonb NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  analyzed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_wci_workspace ON public.whatsapp_conversation_insights(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wci_conversation ON public.whatsapp_conversation_insights(conversation_id);
CREATE INDEX IF NOT EXISTS idx_wci_urgency ON public.whatsapp_conversation_insights(workspace_id, urgency);
CREATE INDEX IF NOT EXISTS idx_wci_intent ON public.whatsapp_conversation_insights(workspace_id, intent);
CREATE INDEX IF NOT EXISTS idx_wci_analyzed_at ON public.whatsapp_conversation_insights(workspace_id, analyzed_at DESC);

ALTER TABLE public.whatsapp_conversation_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wci_select_members" ON public.whatsapp_conversation_insights;
CREATE POLICY "wci_select_members"
ON public.whatsapp_conversation_insights
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "wci_insert_members" ON public.whatsapp_conversation_insights;
CREATE POLICY "wci_insert_members"
ON public.whatsapp_conversation_insights
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "wci_update_members" ON public.whatsapp_conversation_insights;
CREATE POLICY "wci_update_members"
ON public.whatsapp_conversation_insights
FOR UPDATE TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "wci_delete_admins" ON public.whatsapp_conversation_insights;
CREATE POLICY "wci_delete_admins"
ON public.whatsapp_conversation_insights
FOR DELETE TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

DROP TRIGGER IF EXISTS trg_wci_updated_at ON public.whatsapp_conversation_insights;
CREATE TRIGGER trg_wci_updated_at
BEFORE UPDATE ON public.whatsapp_conversation_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) whatsapp_conversation_insight_runs (histórico de execuções)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_insight_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  triggered_by uuid NULL,
  trigger_type text NOT NULL DEFAULT 'manual',
  input_message_count integer NULL,
  output jsonb NULL,
  success boolean NOT NULL DEFAULT true,
  error text NULL,
  duration_ms integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wcir_workspace ON public.whatsapp_conversation_insight_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wcir_conversation ON public.whatsapp_conversation_insight_runs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wcir_created ON public.whatsapp_conversation_insight_runs(workspace_id, created_at DESC);

ALTER TABLE public.whatsapp_conversation_insight_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wcir_select_members" ON public.whatsapp_conversation_insight_runs;
CREATE POLICY "wcir_select_members"
ON public.whatsapp_conversation_insight_runs
FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "wcir_insert_members" ON public.whatsapp_conversation_insight_runs;
CREATE POLICY "wcir_insert_members"
ON public.whatsapp_conversation_insight_runs
FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- 3) Setting de auto-análise por workspace
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'workspace_settings'
  ) THEN
    BEGIN
      ALTER TABLE public.workspace_settings
        ADD COLUMN IF NOT EXISTS whatsapp_pro_auto_analyze_inbound boolean NOT NULL DEFAULT false;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not add whatsapp_pro_auto_analyze_inbound: %', SQLERRM;
    END;
  END IF;
END$$;
