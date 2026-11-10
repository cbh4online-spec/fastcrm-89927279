ALTER TABLE public.cloudtalk_calls
  ADD COLUMN transcript jsonb,
  ADD COLUMN summary text,
  ADD COLUMN sentiment text CHECK (sentiment IS NULL OR sentiment IN ('positive','neutral','negative')),
  ADD COLUMN action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN ai_source text CHECK (ai_source IS NULL OR ai_source IN ('cloudtalk','fastcrm')),
  ADD COLUMN ai_status text CHECK (ai_status IS NULL OR ai_status IN ('pending','processing','done','failed','skipped')),
  ADD COLUMN ai_error text,
  ADD COLUMN ai_generated_at timestamptz;
ALTER TABLE public.cloudtalk_connections ADD COLUMN auto_ai_summary boolean NOT NULL DEFAULT false;
GRANT SELECT (auto_ai_summary) ON public.cloudtalk_connections TO authenticated;
CREATE INDEX cloudtalk_calls_ai_day_idx ON public.cloudtalk_calls(workspace_id, ai_generated_at) WHERE ai_source = 'fastcrm';