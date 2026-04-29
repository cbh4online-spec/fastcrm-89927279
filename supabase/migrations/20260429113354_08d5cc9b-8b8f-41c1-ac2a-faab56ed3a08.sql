DO $$ BEGIN
  CREATE TYPE public.commercial_profile AS ENUM ('vendedor','gestor','diretor','ceo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS commercial_profile public.commercial_profile NOT NULL DEFAULT 'vendedor';