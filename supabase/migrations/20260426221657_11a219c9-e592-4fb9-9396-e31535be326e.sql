-- ============================================================
-- HTML Builder Studio — Phase 1 (foundation)
-- ============================================================

-- Enum: tipo de asset
DO $$ BEGIN
  CREATE TYPE public.builder_asset_type AS ENUM ('site','landing','funnel','form','newsletter');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum: estado do asset
DO $$ BEGIN
  CREATE TYPE public.builder_asset_status AS ENUM ('draft','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- builder_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL,
  type            public.builder_asset_type NOT NULL,
  status          public.builder_asset_status NOT NULL DEFAULT 'draft',
  name            text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  slug            text NOT NULL CHECK (char_length(slug) BETWEEN 1 AND 160),
  description     text CHECK (description IS NULL OR char_length(description) <= 1000),
  html            text NOT NULL DEFAULT '',
  css             text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url   text,
  created_by      uuid NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT builder_assets_slug_per_workspace UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_builder_assets_workspace ON public.builder_assets(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_builder_assets_type ON public.builder_assets(workspace_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_builder_assets_status ON public.builder_assets(workspace_id, status) WHERE deleted_at IS NULL;

ALTER TABLE public.builder_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_assets_select"
ON public.builder_assets FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "builder_assets_insert"
ON public.builder_assets FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "builder_assets_update"
ON public.builder_assets FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "builder_assets_delete"
ON public.builder_assets FOR DELETE
USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- ============================================================
-- builder_asset_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_asset_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid NOT NULL REFERENCES public.builder_assets(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL,
  version_number  integer NOT NULL,
  html            text NOT NULL,
  css             text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes           text CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_by      uuid NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT builder_asset_versions_unique UNIQUE (asset_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_builder_asset_versions_asset ON public.builder_asset_versions(asset_id, version_number DESC);

ALTER TABLE public.builder_asset_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_asset_versions_select"
ON public.builder_asset_versions FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "builder_asset_versions_insert"
ON public.builder_asset_versions FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid());

CREATE POLICY "builder_asset_versions_delete"
ON public.builder_asset_versions FOR DELETE
USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

-- ============================================================
-- builder_templates (public + private)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.builder_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid,
  is_public       boolean NOT NULL DEFAULT false,
  type            public.builder_asset_type NOT NULL,
  name            text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description     text CHECK (description IS NULL OR char_length(description) <= 1000),
  category        text,
  html            text NOT NULL,
  css             text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumbnail_url   text,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT builder_templates_scope_check CHECK (
    (is_public = true AND workspace_id IS NULL) OR
    (is_public = false AND workspace_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_builder_templates_public ON public.builder_templates(type) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_builder_templates_workspace ON public.builder_templates(workspace_id, type) WHERE deleted_at IS NULL;

ALTER TABLE public.builder_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "builder_templates_select_public"
ON public.builder_templates FOR SELECT
USING (
  is_public = true
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "builder_templates_insert_private"
ON public.builder_templates FOR INSERT
WITH CHECK (
  is_public = false
  AND workspace_id IS NOT NULL
  AND public.is_workspace_member(auth.uid(), workspace_id)
  AND created_by = auth.uid()
);

CREATE POLICY "builder_templates_update_private"
ON public.builder_templates FOR UPDATE
USING (
  (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "builder_templates_delete_private"
ON public.builder_templates FOR DELETE
USING (
  (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
  OR public.is_super_admin(auth.uid())
);

-- ============================================================
-- Triggers: updated_at auto
-- ============================================================
CREATE TRIGGER trg_builder_assets_updated_at
BEFORE UPDATE ON public.builder_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_builder_templates_updated_at
BEFORE UPDATE ON public.builder_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
