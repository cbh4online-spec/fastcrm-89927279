-- Guard-rail: prevent two workspaces from owning the same social channel concurrently
-- Allows the same ghl_account_id to exist across workspaces only when at most one is active
CREATE UNIQUE INDEX IF NOT EXISTS idx_ghl_social_active_unique
ON public.workspace_ghl_social_channels (ghl_account_id, channel_type)
WHERE is_active = true;