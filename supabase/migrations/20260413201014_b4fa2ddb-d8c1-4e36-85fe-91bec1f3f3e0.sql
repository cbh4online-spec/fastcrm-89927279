-- Add is_primary flag to workspace_ghl_config
ALTER TABLE public.workspace_ghl_config
ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Set METODOPARE as primary for the shared location
UPDATE public.workspace_ghl_config
SET is_primary = true
WHERE workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f'
  AND ghl_location_id = '9peybYsaEdbhFf2GO0Bx';

-- Unique partial index: only one primary per ghl_location_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_ghl_config_primary_per_location
ON public.workspace_ghl_config (ghl_location_id)
WHERE is_primary = true;

-- Add a comment for documentation
COMMENT ON COLUMN public.workspace_ghl_config.is_primary IS 'When multiple workspaces share the same ghl_location_id, only the primary workspace processes webhooks and cron syncs';