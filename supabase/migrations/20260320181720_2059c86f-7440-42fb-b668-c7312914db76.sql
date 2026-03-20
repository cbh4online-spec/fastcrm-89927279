
-- Enable realtime on marketing_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_events;

-- Campaign landing pages
CREATE TABLE public.campaign_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  template_html text,
  form_fields jsonb DEFAULT '[]'::jsonb,
  thank_you_message text DEFAULT 'Obrigado pelo seu registo!',
  redirect_url text,
  is_published boolean DEFAULT false,
  visits_count int DEFAULT 0,
  submissions_count int DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.campaign_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage landing pages" ON public.campaign_landing_pages
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Landing page submissions
CREATE TABLE public.landing_page_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  landing_page_id uuid REFERENCES public.campaign_landing_pages(id) ON DELETE CASCADE NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  email text,
  name text,
  phone text,
  source_url text,
  ip_hash text,
  user_agent text,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.landing_page_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view submissions" ON public.landing_page_submissions
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Public can submit forms" ON public.landing_page_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

-- Multi-channel sequences
CREATE TABLE public.multichannel_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed')),
  channels text[] DEFAULT ARRAY['email']::text[],
  total_enrolled int DEFAULT 0,
  total_completed int DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.multichannel_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage multichannel sequences" ON public.multichannel_sequences
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Multi-channel sequence steps
CREATE TABLE public.multichannel_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES public.multichannel_sequences(id) ON DELETE CASCADE NOT NULL,
  step_order int NOT NULL DEFAULT 1,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms','wait','condition')),
  action_type text NOT NULL DEFAULT 'send' CHECK (action_type IN ('send','wait','condition','split')),
  content jsonb DEFAULT '{}'::jsonb,
  delay_hours int DEFAULT 0,
  delay_days int DEFAULT 0,
  condition_type text,
  condition_value text,
  template_id uuid,
  subject text,
  body_html text,
  whatsapp_template text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.multichannel_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage sequence steps" ON public.multichannel_sequence_steps
  FOR ALL TO authenticated
  USING (sequence_id IN (
    SELECT id FROM public.multichannel_sequences WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (sequence_id IN (
    SELECT id FROM public.multichannel_sequences WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Campaign report snapshots
CREATE TABLE public.campaign_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage report snapshots" ON public.campaign_report_snapshots
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
