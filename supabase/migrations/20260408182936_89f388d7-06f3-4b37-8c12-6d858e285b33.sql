
-- Enum for category dimensions
DO $$ BEGIN
  CREATE TYPE public.manager_category_dimension AS ENUM ('segment', 'territory', 'client_type');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Available category values per workspace
CREATE TABLE public.manager_profile_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  dimension public.manager_category_dimension NOT NULL,
  value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, dimension, value)
);

ALTER TABLE public.manager_profile_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view categories"
  ON public.manager_profile_categories FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Admins can manage categories"
  ON public.manager_profile_categories FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner')))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner')));

-- Manager profiles with category assignments
CREATE TABLE public.manager_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  segments TEXT[] NOT NULL DEFAULT '{}',
  territories TEXT[] NOT NULL DEFAULT '{}',
  client_types TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.manager_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view manager profiles"
  ON public.manager_profiles FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Admins can manage manager profiles"
  ON public.manager_profiles FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner')))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner')));

-- Indexes
CREATE INDEX idx_manager_profile_categories_ws ON public.manager_profile_categories(workspace_id, dimension);
CREATE INDEX idx_manager_profiles_ws ON public.manager_profiles(workspace_id);
CREATE INDEX idx_manager_profiles_user ON public.manager_profiles(user_id);
