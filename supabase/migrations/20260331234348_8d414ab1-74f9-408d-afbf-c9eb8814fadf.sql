
-- B1: Add contact_id and lead_id to marketing_events
ALTER TABLE public.marketing_events 
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_events_contact_id ON public.marketing_events(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_events_lead_id ON public.marketing_events(lead_id) WHERE lead_id IS NOT NULL;

-- Add lead_id to campaign_link_clicks
ALTER TABLE public.campaign_link_clicks
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- B1: Create campaign_attribution table
CREATE TABLE IF NOT EXISTS public.campaign_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  attribution_model TEXT NOT NULL DEFAULT 'equal_share',
  attribution_type TEXT NOT NULL DEFAULT 'influenced',
  revenue_attributed NUMERIC DEFAULT 0,
  revenue_influenced NUMERIC DEFAULT 0,
  event_type TEXT,
  attributed_at TIMESTAMPTZ DEFAULT now(),
  attribution_window_days INT DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_attribution_workspace ON public.campaign_attribution(workspace_id);
CREATE INDEX idx_campaign_attribution_campaign ON public.campaign_attribution(campaign_id);
CREATE INDEX idx_campaign_attribution_contact ON public.campaign_attribution(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_campaign_attribution_opportunity ON public.campaign_attribution(opportunity_id) WHERE opportunity_id IS NOT NULL;

-- RLS
ALTER TABLE public.campaign_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view campaign attribution"
  ON public.campaign_attribution FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert campaign attribution"
  ON public.campaign_attribution FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update campaign attribution"
  ON public.campaign_attribution FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete campaign attribution"
  ON public.campaign_attribution FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );
