-- The legacy UNIQUE (workspace_id, group_id) blocks the new per-instance upsert
-- used by whatsapp-zapi-sync-groups, which infers conflict on
-- (workspace_id, provider_instance_id, group_id).
ALTER TABLE public.whatsapp_zapi_groups
  DROP CONSTRAINT IF EXISTS whatsapp_zapi_groups_workspace_id_group_id_key;
