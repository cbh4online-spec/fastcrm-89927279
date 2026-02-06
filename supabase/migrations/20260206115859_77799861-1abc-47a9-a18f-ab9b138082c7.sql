
-- Add OAuth token columns to workspace_video_config for hybrid OAuth flow
-- Zoom OAuth tokens
ALTER TABLE public.workspace_video_config 
  ADD COLUMN IF NOT EXISTS zoom_access_token text,
  ADD COLUMN IF NOT EXISTS zoom_refresh_token text,
  ADD COLUMN IF NOT EXISTS zoom_token_expires_at timestamptz;

-- Google OAuth credentials + tokens (replacing Service Account approach)
ALTER TABLE public.workspace_video_config 
  ADD COLUMN IF NOT EXISTS google_client_id text,
  ADD COLUMN IF NOT EXISTS google_client_secret_encrypted text,
  ADD COLUMN IF NOT EXISTS google_access_token text,
  ADD COLUMN IF NOT EXISTS google_refresh_token text,
  ADD COLUMN IF NOT EXISTS google_token_expires_at timestamptz;
