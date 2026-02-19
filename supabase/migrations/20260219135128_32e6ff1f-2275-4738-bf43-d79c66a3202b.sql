
CREATE TABLE IF NOT EXISTS public.conversation_signals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id          uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id             uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  temperature         text CHECK (temperature IN ('cold','evaluating','ready_to_buy','stalling','lost')),
  close_probability   numeric(5,4),
  trust_score         numeric(5,4),
  churn_risk          numeric(5,4),
  main_objection      text CHECK (main_objection IN ('price','timing','authority','competitor','uncertainty','no_need','confusion','none')),
  next_action         text,
  recommended_reply   text,
  buying_intent_score numeric(5,4),
  urgency_score       numeric(5,4),
  signals_data        jsonb,
  last_updated        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_per_entity CHECK (
    (contact_id IS NOT NULL AND lead_id IS NULL) OR
    (lead_id IS NOT NULL AND contact_id IS NULL) OR
    (contact_id IS NULL AND lead_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_signals_contact_idx 
  ON public.conversation_signals(workspace_id, contact_id) 
  WHERE contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversation_signals_lead_idx 
  ON public.conversation_signals(workspace_id, lead_id) 
  WHERE lead_id IS NOT NULL;

ALTER TABLE public.conversation_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members read signals"
  ON public.conversation_signals FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role manages signals"
  ON public.conversation_signals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
