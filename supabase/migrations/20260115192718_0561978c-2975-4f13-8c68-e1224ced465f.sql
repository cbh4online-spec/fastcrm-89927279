-- Add CAE columns to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS cae_codes text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cae_description text,
ADD COLUMN IF NOT EXISTS company_status text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS twitter_url text;

-- Create GIN index for CAE codes search
CREATE INDEX IF NOT EXISTS idx_workspaces_cae_codes ON public.workspaces USING GIN(cae_codes);