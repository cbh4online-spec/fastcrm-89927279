CREATE TABLE public.whatsapp_mcp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  tool TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_whatsapp_mcp_requests_ws_key UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX idx_whatsapp_mcp_requests_ws_created
  ON public.whatsapp_mcp_requests (workspace_id, created_at DESC);

GRANT SELECT, INSERT ON public.whatsapp_mcp_requests TO authenticated;
GRANT ALL ON public.whatsapp_mcp_requests TO service_role;

ALTER TABLE public.whatsapp_mcp_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read mcp whatsapp requests"
  ON public.whatsapp_mcp_requests FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members insert mcp whatsapp requests"
  ON public.whatsapp_mcp_requests FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Service role manages mcp whatsapp requests"
  ON public.whatsapp_mcp_requests FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);