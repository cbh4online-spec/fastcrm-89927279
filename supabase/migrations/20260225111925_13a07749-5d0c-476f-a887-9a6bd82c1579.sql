ALTER TABLE public.revenue_forecasts 
  ADD COLUMN IF NOT EXISTS health_adjusted_expected numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pipeline_health_avg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forecast_confidence numeric DEFAULT 0;