
-- =============================================
-- MCP Provider Registry for Marketing Module
-- =============================================

-- 1. marketing_mcp_providers
CREATE TABLE public.marketing_mcp_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  provider_name text NOT NULL,
  provider_type text NOT NULL DEFAULT 'mcp',
  server_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'bearer',
  encrypted_credentials_json jsonb DEFAULT '{}',
  is_enabled boolean NOT NULL DEFAULT false,
  is_default_for_pages boolean NOT NULL DEFAULT false,
  is_default_for_funnels boolean NOT NULL DEFAULT false,
  connection_status text NOT NULL DEFAULT 'unknown',
  last_health_check_at timestamptz,
  last_error text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider_key)
);

CREATE INDEX idx_mcp_providers_workspace ON public.marketing_mcp_providers(workspace_id);
CREATE INDEX idx_mcp_providers_enabled ON public.marketing_mcp_providers(workspace_id, is_enabled) WHERE is_enabled = true;
CREATE INDEX idx_mcp_providers_key ON public.marketing_mcp_providers(workspace_id, provider_key);

ALTER TABLE public.marketing_mcp_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view MCP providers"
  ON public.marketing_mcp_providers FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_providers.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create MCP providers"
  ON public.marketing_mcp_providers FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_providers.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update MCP providers"
  ON public.marketing_mcp_providers FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_providers.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete MCP providers"
  ON public.marketing_mcp_providers FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_providers.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- 2. marketing_mcp_workflow_bindings
CREATE TABLE public.marketing_mcp_workflow_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_type text NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.marketing_mcp_providers(id) ON DELETE CASCADE,
  config_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, workflow_type)
);

CREATE INDEX idx_mcp_bindings_workspace ON public.marketing_mcp_workflow_bindings(workspace_id);
CREATE INDEX idx_mcp_bindings_provider ON public.marketing_mcp_workflow_bindings(provider_id);

ALTER TABLE public.marketing_mcp_workflow_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view MCP workflow bindings"
  ON public.marketing_mcp_workflow_bindings FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_workflow_bindings.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create MCP workflow bindings"
  ON public.marketing_mcp_workflow_bindings FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_workflow_bindings.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update MCP workflow bindings"
  ON public.marketing_mcp_workflow_bindings FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_workflow_bindings.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete MCP workflow bindings"
  ON public.marketing_mcp_workflow_bindings FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_workflow_bindings.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- 3. Updated_at triggers
CREATE TRIGGER update_marketing_mcp_providers_updated_at
  BEFORE UPDATE ON public.marketing_mcp_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_mcp_workflow_bindings_updated_at
  BEFORE UPDATE ON public.marketing_mcp_workflow_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
