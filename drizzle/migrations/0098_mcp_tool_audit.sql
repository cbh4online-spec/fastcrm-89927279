CREATE TABLE public.mcp_tool_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  workspace_id uuid,
  client_id text,
  tool_name text NOT NULL CHECK (length(tool_name) <= 80),
  duration_ms integer,
  ok boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mcp_tool_audit TO authenticated;
GRANT ALL ON public.mcp_tool_audit TO service_role;
ALTER TABLE public.mcp_tool_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert" ON public.mcp_tool_audit FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (workspace_id IS NULL OR workspace_id IN (SELECT public.get_user_workspace_ids())));
CREATE POLICY "workspace or super admin read" ON public.mcp_tool_audit FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (SELECT public.is_super_admin(auth.uid())));
CREATE INDEX mcp_tool_audit_ws_created_idx ON public.mcp_tool_audit (workspace_id, created_at DESC);