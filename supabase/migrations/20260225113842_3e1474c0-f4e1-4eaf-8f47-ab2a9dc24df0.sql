ALTER TABLE public.revenue_forecasts 
  ADD COLUMN IF NOT EXISTS stage_weighted numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS healthy_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS watch_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS at_risk_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blockers jsonb DEFAULT '[]'::jsonb;