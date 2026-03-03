
-- Add risk_level and reasons_json to renewal_contracts
DO $$ BEGIN
  CREATE TYPE public.renewal_risk_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.renewal_contracts 
  ADD COLUMN IF NOT EXISTS risk_level public.renewal_risk_level DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS reasons_json jsonb DEFAULT '[]'::jsonb;
