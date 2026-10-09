-- Evidence required to determine whether a prospecting channel may be opened.
-- Legacy rows remain readable, but the new guards fail closed until reviewed.
ALTER TABLE public.outreach_validations
  ADD COLUMN IF NOT EXISTS recipient_category text,
  ADD COLUMN IF NOT EXISTS relationship_kind text,
  ADD COLUMN IF NOT EXISTS analogous_offer_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS optout_at_collection_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generic_corporate_address_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dgc_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS dgc_list_reference text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outreach_validations_recipient_category_check') THEN
    ALTER TABLE public.outreach_validations ADD CONSTRAINT outreach_validations_recipient_category_check
      CHECK (recipient_category IS NULL OR recipient_category IN ('individual', 'corporate'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outreach_validations_relationship_kind_check') THEN
    ALTER TABLE public.outreach_validations ADD CONSTRAINT outreach_validations_relationship_kind_check
      CHECK (relationship_kind IS NULL OR relationship_kind IN ('new', 'existing_customer'));
  END IF;
END $$;
