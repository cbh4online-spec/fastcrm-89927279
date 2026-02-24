ALTER TABLE public.workspace_onboarding
  ADD COLUMN IF NOT EXISTS revenue_model text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS sales_complexity text,
  ADD COLUMN IF NOT EXISTS primary_objective text,
  ADD COLUMN IF NOT EXISTS computed_segment text,
  ADD COLUMN IF NOT EXISTS activated_bundle text,
  ADD COLUMN IF NOT EXISTS onboarding_duration_ms integer;