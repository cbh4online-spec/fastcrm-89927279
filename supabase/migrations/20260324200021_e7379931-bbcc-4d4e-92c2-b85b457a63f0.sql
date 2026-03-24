
CREATE TABLE IF NOT EXISTS public.vision_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  objective TEXT,
  target_date DATE,
  mode TEXT DEFAULT 'solo',
  status TEXT DEFAULT 'active',
  manifesto TEXT,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  metrics JSONB DEFAULT '{}',
  closed_at TIMESTAMPTZ,
  review_notes TEXT,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  energy_level INT DEFAULT 5,
  focus_items JSONB DEFAULT '[]',
  intentions JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  reflections TEXT,
  duration_minutes INT,
  sprint_id UUID REFERENCES public.vision_sprints(id),
  status TEXT DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'text',
  title TEXT,
  content TEXT,
  color TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  impact_level TEXT,
  celebrated BOOLEAN DEFAULT false,
  date DATE DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vision_duo_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_id UUID NOT NULL REFERENCES public.vision_profiles(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_id UUID,
  invite_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT DEFAULT 'pending',
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vision_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_wins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vision_duo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vision_profiles_workspace" ON public.vision_profiles FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "vision_sprints_workspace" ON public.vision_sprints FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "vision_briefings_workspace" ON public.vision_daily_briefings FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "vision_board_workspace" ON public.vision_board_items FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "vision_wins_workspace" ON public.vision_wins FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
CREATE POLICY "vision_duo_workspace" ON public.vision_duo_links FOR ALL USING (
  workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid())
);
