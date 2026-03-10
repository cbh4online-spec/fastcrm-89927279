
-- Vision Profiles (core entity)
CREATE TABLE public.vision_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  target_date DATE,
  manifesto TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  mode TEXT NOT NULL DEFAULT 'solo',
  linked_funnel_id UUID,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own vision profiles" ON public.vision_profiles FOR ALL USING (user_id = auth.uid());

-- Vision Board Items
CREATE TABLE public.vision_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'image',
  title TEXT,
  content TEXT,
  image_url TEXT,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 200,
  height NUMERIC DEFAULT 200,
  color TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage vision board items" ON public.vision_board_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.vision_profiles vp WHERE vp.id = vision_id AND vp.user_id = auth.uid()));

-- Vision Sprints (quinzenais)
CREATE TABLE public.vision_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  review_notes TEXT,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.vision_sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage vision sprints" ON public.vision_sprints FOR ALL
  USING (EXISTS (SELECT 1 FROM public.vision_profiles vp WHERE vp.id = vision_id AND vp.user_id = auth.uid()));

-- Vision Daily Briefings (sessão guiada 50min)
CREATE TABLE public.vision_daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.vision_sprints(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_level INT,
  focus_items JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  intentions JSONB DEFAULT '[]',
  reflections TEXT,
  duration_minutes INT,
  status TEXT NOT NULL DEFAULT 'started',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_daily_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily briefings" ON public.vision_daily_briefings FOR ALL USING (user_id = auth.uid());

-- Vision Wins
CREATE TABLE public.vision_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  impact_level TEXT DEFAULT 'medium',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  celebrated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_wins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own vision wins" ON public.vision_wins FOR ALL USING (user_id = auth.uid());

-- Vision Duo Links
CREATE TABLE public.vision_duo_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  invite_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

ALTER TABLE public.vision_duo_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage duo links" ON public.vision_duo_links FOR ALL USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- Vision AI Sessions
CREATE TABLE public.vision_ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL,
  prompt TEXT,
  response TEXT,
  model TEXT,
  tokens_used INT,
  credits_consumed INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own AI sessions" ON public.vision_ai_sessions FOR ALL USING (user_id = auth.uid());

-- Add indexes
CREATE INDEX idx_vision_profiles_workspace ON public.vision_profiles(workspace_id);
CREATE INDEX idx_vision_profiles_user ON public.vision_profiles(user_id);
CREATE INDEX idx_vision_sprints_vision ON public.vision_sprints(vision_id);
CREATE INDEX idx_vision_daily_workspace ON public.vision_daily_briefings(workspace_id, date);
CREATE INDEX idx_vision_wins_vision ON public.vision_wins(vision_id);
CREATE INDEX idx_vision_ai_sessions_vision ON public.vision_ai_sessions(vision_id);
