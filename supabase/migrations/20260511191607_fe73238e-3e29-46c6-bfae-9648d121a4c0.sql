-- ─────────────────────────────────────────────────────────────────────────────
-- Builder Sites: clonagem integral de sites externos para dentro do workspace
-- ─────────────────────────────────────────────────────────────────────────────

-- Estado de um trabalho de clonagem
DO $$ BEGIN
  CREATE TYPE public.builder_site_status AS ENUM (
    'discovering',  -- a descobrir URLs
    'pending',      -- aguarda confirmação do utilizador
    'cloning',      -- a clonar páginas
    'completed',    -- terminado
    'failed',       -- falha total
    'partial',      -- algumas páginas falharam
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.builder_site_page_status AS ENUM (
    'pending',
    'cloning',
    'ok',
    'error',
    'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── builder_sites ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.builder_sites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL,
  asset_id        uuid REFERENCES public.builder_assets(id) ON DELETE SET NULL,
  source_url      text NOT NULL,
  source_host     text NOT NULL,
  name            text NOT NULL,
  status          public.builder_site_status NOT NULL DEFAULT 'discovering',
  pages_total     integer NOT NULL DEFAULT 0,
  pages_done      integer NOT NULL DEFAULT 0,
  pages_failed    integer NOT NULL DEFAULT 0,
  options         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { maxDepth, maxPages, includeSubdomains, keepScripts, ... }
  design_tokens   jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { colors, fonts, logo, ... }
  error           text,
  created_by      uuid NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  CONSTRAINT builder_sites_name_chk CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT builder_sites_source_chk CHECK (char_length(source_url) BETWEEN 7 AND 2048)
);

CREATE INDEX IF NOT EXISTS idx_builder_sites_workspace ON public.builder_sites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_builder_sites_status    ON public.builder_sites(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_builder_sites_asset     ON public.builder_sites(asset_id);

-- ─── builder_site_pages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.builder_site_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.builder_sites(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL,
  source_url      text NOT NULL,
  path            text NOT NULL,                -- ex: '/', '/sobre', '/produto/abc'
  slug            text NOT NULL,                -- slug interno único por site
  title           text,
  html            text NOT NULL DEFAULT '',
  status          public.builder_site_page_status NOT NULL DEFAULT 'pending',
  order_index     integer NOT NULL DEFAULT 0,
  bytes           integer NOT NULL DEFAULT 0,
  error           text,
  is_home         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT builder_site_pages_slug_unique UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_builder_site_pages_site      ON public.builder_site_pages(site_id, order_index);
CREATE INDEX IF NOT EXISTS idx_builder_site_pages_status    ON public.builder_site_pages(site_id, status);
CREATE INDEX IF NOT EXISTS idx_builder_site_pages_workspace ON public.builder_site_pages(workspace_id);

-- ─── builder_site_assets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.builder_site_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.builder_sites(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL,
  original_url    text NOT NULL,
  storage_path    text NOT NULL,            -- caminho dentro do bucket builder-site-assets
  content_type    text,
  bytes           integer NOT NULL DEFAULT 0,
  sha256          text,
  kind            text NOT NULL DEFAULT 'other', -- image | css | js | font | other
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT builder_site_assets_unique UNIQUE (site_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_builder_site_assets_site   ON public.builder_site_assets(site_id);
CREATE INDEX IF NOT EXISTS idx_builder_site_assets_sha    ON public.builder_site_assets(site_id, sha256);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.builder_sites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_site_pages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_site_assets ENABLE ROW LEVEL SECURITY;

-- Helper: assume função pública is_workspace_member já existe no schema
DO $$
DECLARE
  has_fn boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_workspace_member'
  ) INTO has_fn;

  IF NOT has_fn THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid, _user_id uuid)
      RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $body$
        SELECT EXISTS (
          SELECT 1 FROM public.workspace_members
          WHERE workspace_id = _workspace_id AND user_id = _user_id
        );
      $body$;
    $f$;
  END IF;
END $$;

-- builder_sites policies
DROP POLICY IF EXISTS "sites_select_member" ON public.builder_sites;
CREATE POLICY "sites_select_member" ON public.builder_sites FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "sites_insert_member" ON public.builder_sites;
CREATE POLICY "sites_insert_member" ON public.builder_sites FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "sites_update_member" ON public.builder_sites;
CREATE POLICY "sites_update_member" ON public.builder_sites FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "sites_delete_member" ON public.builder_sites;
CREATE POLICY "sites_delete_member" ON public.builder_sites FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- builder_site_pages policies
DROP POLICY IF EXISTS "pages_all_member" ON public.builder_site_pages;
CREATE POLICY "pages_all_member" ON public.builder_site_pages FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- builder_site_assets policies
DROP POLICY IF EXISTS "site_assets_all_member" ON public.builder_site_assets;
CREATE POLICY "site_assets_all_member" ON public.builder_site_assets FOR ALL
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- ─── Trigger de updated_at ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_builder_sites_updated      ON public.builder_sites;
CREATE TRIGGER trg_builder_sites_updated
  BEFORE UPDATE ON public.builder_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_builder_site_pages_updated ON public.builder_site_pages;
CREATE TRIGGER trg_builder_site_pages_updated
  BEFORE UPDATE ON public.builder_site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Storage bucket ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('builder-site-assets', 'builder-site-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage policies (público para leitura; gravação só para membros)
DROP POLICY IF EXISTS "builder_site_assets_public_read" ON storage.objects;
CREATE POLICY "builder_site_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'builder-site-assets');

DROP POLICY IF EXISTS "builder_site_assets_member_insert" ON storage.objects;
CREATE POLICY "builder_site_assets_member_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'builder-site-assets'
    AND auth.role() IN ('authenticated', 'service_role')
  );

DROP POLICY IF EXISTS "builder_site_assets_member_update" ON storage.objects;
CREATE POLICY "builder_site_assets_member_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'builder-site-assets'
    AND auth.role() IN ('authenticated', 'service_role')
  );

DROP POLICY IF EXISTS "builder_site_assets_member_delete" ON storage.objects;
CREATE POLICY "builder_site_assets_member_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'builder-site-assets'
    AND auth.role() IN ('authenticated', 'service_role')
  );

-- ─── Realtime ──────────────────────────────────────────────────────────────
ALTER TABLE public.builder_sites      REPLICA IDENTITY FULL;
ALTER TABLE public.builder_site_pages REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_sites;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.builder_site_pages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
