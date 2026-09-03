-- =====================================================================
-- WhatsApp Groups (Z-API) — P0 foundation
-- Additive only: new columns, new tables, indexes, RLS, grants.
-- =====================================================================

-- 1) whatsapp_zapi_groups — enrich
ALTER TABLE public.whatsapp_zapi_groups
  ADD COLUMN IF NOT EXISTS provider_instance_id UUID REFERENCES public.whatsapp_provider_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_community BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS invite_link TEXT,
  ADD COLUMN IF NOT EXISTS invite_link_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS admin_only_message BOOLEAN,
  ADD COLUMN IF NOT EXISTS admin_only_settings BOOLEAN,
  ADD COLUMN IF NOT EXISTS admin_only_add_member BOOLEAN,
  ADD COLUMN IF NOT EXISTS require_admin_approval BOOLEAN;

ALTER TABLE public.whatsapp_zapi_groups
  DROP CONSTRAINT IF EXISTS whatsapp_zapi_groups_status_check;
ALTER TABLE public.whatsapp_zapi_groups
  ADD CONSTRAINT whatsapp_zapi_groups_status_check
  CHECK (status IN ('ACTIVE','INACTIVE','LEFT','REMOVED','SYNC_ERROR','UNKNOWN'));

-- backfill provider instance from existing active instance of the workspace
UPDATE public.whatsapp_zapi_groups g
SET provider_instance_id = i.id
FROM public.whatsapp_provider_instances i
WHERE g.provider_instance_id IS NULL
  AND i.workspace_id = g.workspace_id
  AND i.active = true;

-- existing synced rows are assumed active
UPDATE public.whatsapp_zapi_groups
SET status = 'ACTIVE'
WHERE status = 'UNKNOWN' AND last_synced_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_zapi_groups_ws_instance_group_uidx
  ON public.whatsapp_zapi_groups (workspace_id, provider_instance_id, group_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS whatsapp_zapi_groups_ws_status_idx ON public.whatsapp_zapi_groups (workspace_id, status);
CREATE INDEX IF NOT EXISTS whatsapp_zapi_groups_last_message_idx ON public.whatsapp_zapi_groups (workspace_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS whatsapp_zapi_groups_last_synced_idx ON public.whatsapp_zapi_groups (workspace_id, last_synced_at DESC);

-- 2) participants
CREATE TABLE IF NOT EXISTS public.whatsapp_zapi_group_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  provider_instance_id UUID REFERENCES public.whatsapp_provider_instances(id) ON DELETE SET NULL,
  whatsapp_group_id UUID NOT NULL REFERENCES public.whatsapp_zapi_groups(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  participant_id_raw TEXT NOT NULL,
  normalized_phone TEXT,
  lid TEXT,
  contact_id UUID,
  lead_id UUID,
  display_name TEXT,
  profile_picture_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  membership_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  added_by TEXT,
  joined_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  last_seen_in_group_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  messages_count INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_group_participants_status_check
    CHECK (membership_status IN ('ACTIVE','PENDING_APPROVAL','INVITED','NOT_ADDED','REMOVED','LEFT','REJECTED','UNKNOWN'))
);

GRANT SELECT ON public.whatsapp_zapi_group_participants TO authenticated;
GRANT ALL ON public.whatsapp_zapi_group_participants TO service_role;
ALTER TABLE public.whatsapp_zapi_group_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_group_participants_select" ON public.whatsapp_zapi_group_participants;
CREATE POLICY "wa_group_participants_select"
  ON public.whatsapp_zapi_group_participants FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS wa_group_participants_uidx
  ON public.whatsapp_zapi_group_participants (whatsapp_group_id, participant_id_raw);
CREATE INDEX IF NOT EXISTS wa_group_participants_ws_idx ON public.whatsapp_zapi_group_participants (workspace_id);
CREATE INDEX IF NOT EXISTS wa_group_participants_phone_idx ON public.whatsapp_zapi_group_participants (workspace_id, normalized_phone);
CREATE INDEX IF NOT EXISTS wa_group_participants_contact_idx ON public.whatsapp_zapi_group_participants (workspace_id, contact_id);
CREATE INDEX IF NOT EXISTS wa_group_participants_lead_idx ON public.whatsapp_zapi_group_participants (workspace_id, lead_id);
CREATE INDEX IF NOT EXISTS wa_group_participants_status_idx ON public.whatsapp_zapi_group_participants (workspace_id, membership_status);
CREATE INDEX IF NOT EXISTS wa_group_participants_group_idx ON public.whatsapp_zapi_group_participants (workspace_id, group_id);

-- 3) administrative operations queue
CREATE TABLE IF NOT EXISTS public.whatsapp_group_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  provider_instance_id UUID REFERENCES public.whatsapp_provider_instances(id) ON DELETE SET NULL,
  whatsapp_group_id UUID REFERENCES public.whatsapp_zapi_groups(id) ON DELETE CASCADE,
  group_id TEXT,
  operation_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  result JSONB,
  error TEXT,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_group_operations_type_check CHECK (operation_type IN (
    'CREATE_GROUP','UPDATE_NAME','UPDATE_PHOTO','UPDATE_DESCRIPTION','ADD_PARTICIPANT',
    'REMOVE_PARTICIPANT','APPROVE_PARTICIPANT','REJECT_PARTICIPANT','PROMOTE_ADMIN','DEMOTE_ADMIN',
    'UPDATE_SETTINGS','RESET_INVITE_LINK','ACCEPT_INVITE','LEAVE_GROUP','SEND_MESSAGE'
  )),
  CONSTRAINT whatsapp_group_operations_status_check CHECK (status IN (
    'QUEUED','PROCESSING','SUCCEEDED','PARTIAL_SUCCESS','FAILED','CANCELLED'
  ))
);

GRANT SELECT ON public.whatsapp_group_operations TO authenticated;
GRANT ALL ON public.whatsapp_group_operations TO service_role;
ALTER TABLE public.whatsapp_group_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_group_operations_select" ON public.whatsapp_group_operations;
CREATE POLICY "wa_group_operations_select"
  ON public.whatsapp_group_operations FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS wa_group_operations_idem_uidx
  ON public.whatsapp_group_operations (workspace_id, idempotency_key);
CREATE INDEX IF NOT EXISTS wa_group_operations_status_idx
  ON public.whatsapp_group_operations (workspace_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS wa_group_operations_group_idx
  ON public.whatsapp_group_operations (workspace_id, whatsapp_group_id);

-- 4) audit log
CREATE TABLE IF NOT EXISTS public.whatsapp_group_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  whatsapp_group_id UUID REFERENCES public.whatsapp_zapi_groups(id) ON DELETE CASCADE,
  group_id TEXT,
  action TEXT NOT NULL,
  actor_user_id UUID,
  actor_label TEXT,
  before_state JSONB,
  after_state JSONB,
  operation_id UUID REFERENCES public.whatsapp_group_operations(id) ON DELETE SET NULL,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_group_audit_log TO authenticated;
GRANT ALL ON public.whatsapp_group_audit_log TO service_role;
ALTER TABLE public.whatsapp_group_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_group_audit_select" ON public.whatsapp_group_audit_log;
CREATE POLICY "wa_group_audit_select"
  ON public.whatsapp_group_audit_log FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS wa_group_audit_ws_idx ON public.whatsapp_group_audit_log (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wa_group_audit_group_idx ON public.whatsapp_group_audit_log (workspace_id, whatsapp_group_id, created_at DESC);
