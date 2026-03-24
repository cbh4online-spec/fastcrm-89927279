
-- Add unique constraint for public contacts upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_brief_public_contacts_account_contact_key'
  ) THEN
    ALTER TABLE public.account_brief_public_contacts ADD CONSTRAINT account_brief_public_contacts_account_contact_key UNIQUE (account_id, contact_name);
  END IF;
END $$;
