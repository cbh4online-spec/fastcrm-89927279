
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS nif_country text DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS is_final_consumer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_code text,
  ADD COLUMN IF NOT EXISTS preferred_contact_name text,
  ADD COLUMN IF NOT EXISTS preferred_contact_email text,
  ADD COLUMN IF NOT EXISTS preferred_contact_phone text,
  ADD COLUMN IF NOT EXISTS billing_preferences jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS nif_country text DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS is_final_consumer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_code text,
  ADD COLUMN IF NOT EXISTS preferred_contact_name text,
  ADD COLUMN IF NOT EXISTS preferred_contact_email text,
  ADD COLUMN IF NOT EXISTS preferred_contact_phone text,
  ADD COLUMN IF NOT EXISTS billing_preferences jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS nif_country text DEFAULT 'PT',
  ADD COLUMN IF NOT EXISTS is_final_consumer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_code text,
  ADD COLUMN IF NOT EXISTS preferred_contact_name text,
  ADD COLUMN IF NOT EXISTS preferred_contact_email text,
  ADD COLUMN IF NOT EXISTS preferred_contact_phone text,
  ADD COLUMN IF NOT EXISTS billing_preferences jsonb DEFAULT '{}'::jsonb;
