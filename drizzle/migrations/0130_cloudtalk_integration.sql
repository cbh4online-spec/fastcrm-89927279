CREATE TABLE public.cloudtalk_connections (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  api_key_id text NOT NULL,
  api_key_secret text NOT NULL,
  webhook_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24),'hex'),
  last_event_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (workspace_id, enabled, last_event_at, created_at, updated_at) ON public.cloudtalk_connections TO authenticated;
GRANT ALL ON public.cloudtalk_connections TO service_role;
ALTER TABLE public.cloudtalk_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read cloudtalk connection" ON public.cloudtalk_connections FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));

CREATE TABLE public.cloudtalk_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agent_id text NOT NULL CHECK (char_length(agent_id) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloudtalk_agents TO authenticated;
GRANT ALL ON public.cloudtalk_agents TO service_role;
ALTER TABLE public.cloudtalk_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read agents" ON public.cloudtalk_agents FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "self or manager writes agent" ON public.cloudtalk_agents FOR ALL TO authenticated
  USING ((user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id)) OR public.can_manage_workspace(auth.uid(), workspace_id))
  WITH CHECK ((user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id)) OR public.can_manage_workspace(auth.uid(), workspace_id));

CREATE TABLE public.cloudtalk_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  external_call_id text NOT NULL,
  direction text,
  status text,
  external_number text,
  agent_name text,
  duration_seconds integer,
  started_at timestamptz,
  recording_url text,
  contact_id uuid,
  lead_id uuid,
  company_id uuid,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, external_call_id)
);
CREATE INDEX cloudtalk_calls_contact_idx ON public.cloudtalk_calls(contact_id, started_at DESC);
CREATE INDEX cloudtalk_calls_lead_idx ON public.cloudtalk_calls(lead_id, started_at DESC);
GRANT SELECT ON public.cloudtalk_calls TO authenticated;
GRANT ALL ON public.cloudtalk_calls TO service_role;
ALTER TABLE public.cloudtalk_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read calls" ON public.cloudtalk_calls FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));