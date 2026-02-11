
-- Add privacy columns to community_members
ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_alias TEXT,
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN NOT NULL DEFAULT true;

-- Add community-level privacy settings
ALTER TABLE public.community_settings
  ADD COLUMN IF NOT EXISTS allow_anonymous_profiles BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_profile_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS force_anonymous BOOLEAN NOT NULL DEFAULT false;
