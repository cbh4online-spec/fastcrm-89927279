import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MCPProvider {
  id: string;
  workspace_id: string;
  provider_key: string;
  provider_name: string;
  provider_type: string;
  server_url: string;
  auth_type: string;
  is_enabled: boolean;
  is_default_for_pages: boolean;
  is_default_for_funnels: boolean;
  connection_status: string;
  last_health_check_at: string | null;
  last_error: string | null;
  metadata_json: Record<string, unknown>;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

interface MCPWorkflowBinding {
  id: string;
  workspace_id: string;
  workflow_type: string;
  provider_id: string;
  config_json: Record<string, unknown>;
  provider?: {
    id: string;
    provider_name: string;
    provider_key: string;
    is_enabled: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface MCPImportRecord {
  id: string;
  workspace_id: string;
  provider_id: string;
  import_type: string;
  external_reference_id: string | null;
  external_reference_name: string | null;
  status: string;
  error_message: string | null;
  normalized_payload_json: Record<string, unknown>;
  imported_payload_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NormalizedPayload {
  source: { provider_key: string; reference: string; import_type: string };
  sections: Array<{
    section_type: string;
    section_name: string;
    node_id?: string;
    order: number;
    layout: Record<string, unknown>;
    content_placeholders: string[];
    media_slots: string[];
    cta_slots: string[];
    form_slots: string[];
    responsive_hints: Record<string, unknown>;
    token_references: Record<string, string>;
  }>;
  tokens: { colors: Record<string, string>; typography: Record<string, unknown> };
  components: Array<{ name: string; node_id?: string; variants: string[] }>;
  metadata: {
    section_count: number;
    component_count: number;
    total_nodes: number;
    color_count: number;
    typography_count: number;
  };
}

async function invokeMarketingMCP(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("marketing-mcp", { body });
  if (error) throw new Error(error.message || "Edge function error");
  if (data?.error) throw new Error(data.error);
  return data;
}

// ========================
// PROVIDER HOOKS
// ========================

export function useMCPProviders(workspaceId: string | undefined) {
  return useQuery<MCPProvider[]>({
    queryKey: ["marketing-mcp-providers", workspaceId],
    queryFn: async () => {
      const res = await invokeMarketingMCP({ action: "list_providers", workspace_id: workspaceId });
      return res.providers ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateMCPProvider(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      provider_key: string;
      provider_name: string;
      server_url: string;
      auth_type?: string;
      credentials?: string;
      provider_type?: string;
    }) => invokeMarketingMCP({ action: "create_provider", workspace_id: workspaceId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-providers", workspaceId] });
      toast.success("Provider MCP criado com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMCPProvider(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      provider_id: string;
      provider_name?: string;
      server_url?: string;
      auth_type?: string;
      credentials?: string;
      is_default_for_pages?: boolean;
      is_default_for_funnels?: boolean;
    }) => invokeMarketingMCP({ action: "update_provider", workspace_id: workspaceId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-providers", workspaceId] });
      toast.success("Provider atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMCPProvider(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) =>
      invokeMarketingMCP({ action: "delete_provider", workspace_id: workspaceId, provider_id: providerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-providers", workspaceId] });
      qc.invalidateQueries({ queryKey: ["marketing-mcp-bindings", workspaceId] });
      toast.success("Provider removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleMCPProvider(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, enable }: { providerId: string; enable: boolean }) =>
      invokeMarketingMCP({
        action: enable ? "enable_provider" : "disable_provider",
        workspace_id: workspaceId,
        provider_id: providerId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-providers", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTestMCPConnection(workspaceId: string | undefined) {
  return useMutation({
    mutationFn: (providerId: string) =>
      invokeMarketingMCP({ action: "test_connection", workspace_id: workspaceId, provider_id: providerId }),
  });
}

export function useHealthCheckMCP(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) =>
      invokeMarketingMCP({ action: "health_check", workspace_id: workspaceId, provider_id: providerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-providers", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ========================
// WORKFLOW BINDING HOOKS
// ========================

export function useMCPWorkflowBindings(workspaceId: string | undefined) {
  return useQuery<MCPWorkflowBinding[]>({
    queryKey: ["marketing-mcp-bindings", workspaceId],
    queryFn: async () => {
      const res = await invokeMarketingMCP({ action: "list_bindings", workspace_id: workspaceId });
      return res.bindings ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertMCPBinding(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { workflow_type: string; provider_id: string }) =>
      invokeMarketingMCP({ action: "upsert_binding", workspace_id: workspaceId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-bindings", workspaceId] });
      toast.success("Binding atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMCPBinding(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bindingId: string) =>
      invokeMarketingMCP({ action: "delete_binding", workspace_id: workspaceId, binding_id: bindingId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-bindings", workspaceId] });
      toast.success("Binding removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ========================
// IMPORT HOOKS
// ========================

export function useMCPImports(workspaceId: string | undefined) {
  return useQuery<MCPImportRecord[]>({
    queryKey: ["marketing-mcp-imports", workspaceId],
    queryFn: async () => {
      const res = await invokeMarketingMCP({ action: "list_imports", workspace_id: workspaceId });
      return res.imports ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useMCPImportDetail(workspaceId: string | undefined, importId: string | undefined) {
  return useQuery<MCPImportRecord>({
    queryKey: ["marketing-mcp-import", workspaceId, importId],
    queryFn: async () => {
      const res = await invokeMarketingMCP({ action: "get_import", workspace_id: workspaceId, import_id: importId });
      return res.import;
    },
    enabled: !!workspaceId && !!importId,
  });
}

export function useImportFromMCP(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      provider_id: string;
      import_type: string;
      external_reference: string;
    }) => invokeMarketingMCP({ action: "import_context", workspace_id: workspaceId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-mcp-imports", workspaceId] });
      toast.success("Importação concluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ========================
// GENERATION HOOKS
// ========================

export function useGeneratePageFromMCP(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { import_id: string; title?: string; slug?: string }) =>
      invokeMarketingMCP({ action: "generate_page", workspace_id: workspaceId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing-pages"] });
      toast.success("Landing page gerada com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGenerateFunnelFromMCP(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { import_id: string; name?: string; slug?: string }) =>
      invokeMarketingMCP({ action: "generate_funnel", workspace_id: workspaceId, ...payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funil gerado com sucesso");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
