
-- Product Signals table
CREATE TABLE public.product_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'signup',
  event_data JSONB DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'api',
  score_impact INTEGER DEFAULT 0,
  routing_action TEXT,
  routing_details JSONB,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_product_signals_workspace ON public.product_signals(workspace_id);
CREATE INDEX idx_product_signals_email ON public.product_signals(email);
CREATE INDEX idx_product_signals_event_type ON public.product_signals(event_type);
CREATE INDEX idx_product_signals_created_at ON public.product_signals(created_at DESC);
CREATE INDEX idx_product_signals_lead ON public.product_signals(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_product_signals_contact ON public.product_signals(contact_id) WHERE contact_id IS NOT NULL;

-- RLS
ALTER TABLE public.product_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product signals in their workspace"
  ON public.product_signals FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert product signals in their workspace"
  ON public.product_signals FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Lead Routing Rules table
CREATE TABLE public.lead_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score_min INTEGER NOT NULL DEFAULT 0,
  score_max INTEGER NOT NULL DEFAULT 100,
  action_type TEXT NOT NULL DEFAULT 'assign_owner',
  action_config JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_routing_rules_workspace ON public.lead_routing_rules(workspace_id);

-- RLS
ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routing rules in their workspace"
  ON public.lead_routing_rules FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage routing rules in their workspace"
  ON public.lead_routing_rules FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Enable realtime for product_signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_signals;
