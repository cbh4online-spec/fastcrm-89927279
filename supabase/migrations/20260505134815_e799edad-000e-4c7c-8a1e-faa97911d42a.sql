-- Add is_group to messages metadata via channel_metadata is enough; here we focus on groups cache + idempotency

-- 1. Groups cache
CREATE TABLE IF NOT EXISTS public.whatsapp_zapi_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  group_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  picture_url TEXT,
  participants_count INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_zapi_groups_workspace ON public.whatsapp_zapi_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_zapi_groups_name ON public.whatsapp_zapi_groups(workspace_id, name);

ALTER TABLE public.whatsapp_zapi_groups ENABLE ROW LEVEL SECURITY;

-- Members can view their workspace's groups
CREATE POLICY "zapi_groups_select_members"
ON public.whatsapp_zapi_groups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = whatsapp_zapi_groups.workspace_id
      AND wm.user_id = auth.uid()
  )
  OR public.is_super_admin(auth.uid())
);

-- Only service role writes (webhook / sync function)
CREATE POLICY "zapi_groups_service_all"
ON public.whatsapp_zapi_groups
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update trigger
CREATE OR REPLACE FUNCTION public.touch_zapi_groups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_zapi_groups ON public.whatsapp_zapi_groups;
CREATE TRIGGER trg_touch_zapi_groups
BEFORE UPDATE ON public.whatsapp_zapi_groups
FOR EACH ROW
EXECUTE FUNCTION public.touch_zapi_groups_updated_at();

-- 2. Idempotency index for messages (if not already present)
CREATE INDEX IF NOT EXISTS idx_messages_external_msg_id
  ON public.messages (workspace_id, external_message_id)
  WHERE external_message_id IS NOT NULL;