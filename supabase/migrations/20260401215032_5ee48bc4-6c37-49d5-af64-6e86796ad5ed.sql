
-- Create marketing_mcp_imports table
CREATE TABLE public.marketing_mcp_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.marketing_mcp_providers(id) ON DELETE CASCADE,
  import_type text NOT NULL,
  external_reference_id text,
  external_reference_name text,
  status text NOT NULL DEFAULT 'pending',
  imported_payload_json jsonb DEFAULT '{}',
  normalized_payload_json jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_mcp_imports ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read
CREATE POLICY "Workspace members can view MCP imports"
  ON public.marketing_mcp_imports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = marketing_mcp_imports.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- RLS: service_role handles insert/update (no authenticated policy for writes)

-- Indexes
CREATE INDEX idx_mcp_imports_workspace ON public.marketing_mcp_imports(workspace_id);
CREATE INDEX idx_mcp_imports_provider ON public.marketing_mcp_imports(provider_id);
CREATE INDEX idx_mcp_imports_type ON public.marketing_mcp_imports(import_type);
CREATE INDEX idx_mcp_imports_created ON public.marketing_mcp_imports(created_at DESC);

-- updated_at trigger
CREATE TRIGGER update_marketing_mcp_imports_updated_at
  BEFORE UPDATE ON public.marketing_mcp_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
