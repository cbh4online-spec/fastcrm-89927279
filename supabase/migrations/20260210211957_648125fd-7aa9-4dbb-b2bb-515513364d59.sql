
-- Community Settings
CREATE TABLE public.community_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Comunidade',
  description TEXT,
  slug TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  banner_url TEXT,
  primary_color TEXT,
  newsletter_frequency TEXT NOT NULL DEFAULT 'none' CHECK (newsletter_frequency IN ('none', 'daily', 'weekly')),
  membership_questions_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community settings by workspace"
  ON public.community_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert community settings"
  ON public.community_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = community_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update community settings"
  ON public.community_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = community_settings.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Community Links
CREATE TABLE public.community_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community links"
  ON public.community_links FOR SELECT USING (true);

CREATE POLICY "Admins can manage community links"
  ON public.community_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = community_links.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Community Membership Questions
CREATE TABLE public.community_membership_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text' CHECK (question_type IN ('text', 'single_choice')),
  options JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_membership_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read membership questions"
  ON public.community_membership_questions FOR SELECT USING (true);

CREATE POLICY "Admins can manage membership questions"
  ON public.community_membership_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = community_membership_questions.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Community Events
CREATE TABLE public.community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'event' CHECK (event_type IN ('live', 'event')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  link TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community events"
  ON public.community_events FOR SELECT USING (true);

CREATE POLICY "Admins can manage community events"
  ON public.community_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = community_events.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at on community_settings
CREATE TRIGGER update_community_settings_updated_at
  BEFORE UPDATE ON public.community_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
