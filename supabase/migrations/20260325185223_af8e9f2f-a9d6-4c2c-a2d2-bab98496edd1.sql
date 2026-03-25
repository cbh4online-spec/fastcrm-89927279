-- Expand account_brief_public_contacts with extra fields
ALTER TABLE public.account_brief_public_contacts
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS seniority_level TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT;

-- Expand account_brief_accounts with company social media
ALTER TABLE public.account_brief_accounts
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_main TEXT,
  ADD COLUMN IF NOT EXISTS email_main TEXT;