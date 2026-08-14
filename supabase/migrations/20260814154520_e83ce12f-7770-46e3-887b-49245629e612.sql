DELETE FROM public.workspace_ghl_social_channels a
USING public.workspace_ghl_social_channels b
WHERE a.ctid < b.ctid
  AND a.workspace_id = b.workspace_id
  AND a.channel_type = b.channel_type
  AND a.ghl_account_id = b.ghl_account_id;

CREATE UNIQUE INDEX IF NOT EXISTS workspace_ghl_social_channels_unique_idx
  ON public.workspace_ghl_social_channels (workspace_id, channel_type, ghl_account_id);