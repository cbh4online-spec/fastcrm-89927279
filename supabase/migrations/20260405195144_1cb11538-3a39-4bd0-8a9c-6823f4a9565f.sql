
-- Create SDR pipeline stages table
CREATE TABLE public.sdr_pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.sdr_campaigns(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'blue-500',
  icon text NOT NULL DEFAULT 'Circle',
  is_terminal boolean NOT NULL DEFAULT false,
  is_negative boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, campaign_id, key)
);

CREATE INDEX idx_sdr_pipeline_stages_workspace ON public.sdr_pipeline_stages(workspace_id);
CREATE INDEX idx_sdr_pipeline_stages_campaign ON public.sdr_pipeline_stages(campaign_id);

-- RLS
ALTER TABLE public.sdr_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view SDR stages"
  ON public.sdr_pipeline_stages FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can insert SDR stages"
  ON public.sdr_pipeline_stages FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can update SDR stages"
  ON public.sdr_pipeline_stages FOR UPDATE TO authenticated
  USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can delete SDR stages"
  ON public.sdr_pipeline_stages FOR DELETE TO authenticated
  USING (
    workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Function to seed default stages
CREATE OR REPLACE FUNCTION public.seed_sdr_default_stages(
  p_workspace_id uuid,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sdr_pipeline_stages (workspace_id, campaign_id, key, label, position, color, icon, is_terminal, is_negative)
  VALUES
    (p_workspace_id, p_campaign_id, 'enrolled',       'Prospectados',  0, 'blue-500',    'Users',          false, false),
    (p_workspace_id, p_campaign_id, 'enriching',      'Enriquecidos',  1, 'indigo-500',  'Search',         false, false),
    (p_workspace_id, p_campaign_id, 'sequenced',      'Em Sequência',  2, 'violet-500',  'Mail',           false, false),
    (p_workspace_id, p_campaign_id, 'replied',        'Responderam',   3, 'amber-500',   'MessageSquare',  false, false),
    (p_workspace_id, p_campaign_id, 'positive_reply', 'Reply +',       4, 'orange-500',  'MessageSquare',  false, false),
    (p_workspace_id, p_campaign_id, 'meeting_set',    'Reunião',       5, 'emerald-500', 'Calendar',       false, false),
    (p_workspace_id, p_campaign_id, 'converted',      'Convertidos',   6, 'green-600',   'Trophy',         true,  false),
    (p_workspace_id, p_campaign_id, 'opted_out',      'Opt-out',       7, 'red-500',     'XCircle',        true,  true)
  ON CONFLICT (workspace_id, campaign_id, key) DO NOTHING;
END;
$$;

-- Trigger: auto-seed stages when a campaign is created
CREATE OR REPLACE FUNCTION public.trigger_seed_sdr_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_sdr_default_stages(NEW.workspace_id, NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sdr_campaign_seed_stages
  AFTER INSERT ON public.sdr_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_seed_sdr_stages();
