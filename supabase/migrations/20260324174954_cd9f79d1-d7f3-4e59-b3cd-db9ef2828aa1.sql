
-- Add unique constraints needed for upserts in edge functions
-- account_brief_urls: unique on (account_id, url)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_brief_urls_account_id_url_key'
  ) THEN
    ALTER TABLE public.account_brief_urls ADD CONSTRAINT account_brief_urls_account_id_url_key UNIQUE (account_id, url);
  END IF;
END $$;

-- account_brief_pages: unique on (account_id, url_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_brief_pages_account_id_url_id_key'
  ) THEN
    ALTER TABLE public.account_brief_pages ADD CONSTRAINT account_brief_pages_account_id_url_id_key UNIQUE (account_id, url_id);
  END IF;
END $$;
