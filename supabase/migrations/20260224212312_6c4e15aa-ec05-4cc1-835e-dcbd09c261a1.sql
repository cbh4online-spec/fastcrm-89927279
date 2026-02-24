
-- 1. Create core_object_types table
CREATE TABLE public.core_object_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'box',
  color text NOT NULL DEFAULT '#6366f1',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

ALTER TABLE public.core_object_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage core_object_types in their workspace"
  ON public.core_object_types FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 2. Create core_object_fields table
CREATE TABLE public.core_object_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_id uuid NOT NULL REFERENCES public.custom_objects(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_required boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  options jsonb,
  default_value text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(object_id, slug)
);

ALTER TABLE public.core_object_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage core_object_fields in their workspace"
  ON public.core_object_fields FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3. Create core_object_views table
CREATE TABLE public.core_object_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  object_id uuid NOT NULL REFERENCES public.custom_objects(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  sort_config jsonb NOT NULL DEFAULT '{}',
  visible_fields text[],
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.core_object_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage core_object_views in their workspace"
  ON public.core_object_views FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 4. Add type_id to custom_objects
ALTER TABLE public.custom_objects ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES public.core_object_types(id) ON DELETE SET NULL;
