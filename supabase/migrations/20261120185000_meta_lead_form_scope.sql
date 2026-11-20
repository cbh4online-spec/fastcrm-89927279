ALTER TABLE public.meta_assets
  ADD COLUMN restrict_lead_forms boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.meta_assets.restrict_lead_forms IS
  'Page setting: receive lead ads only from selected form assets on the same Page and connection.';

ALTER TABLE public.meta_leads
  ADD COLUMN scoped_submission_id text,
  ADD CONSTRAINT meta_leads_workspace_scoped_submission_key
    UNIQUE (workspace_id, scoped_submission_id);

COMMENT ON COLUMN public.meta_leads.scoped_submission_id IS
  'Meta lead ID for restricted form deliveries. Legacy rows remain NULL.';
