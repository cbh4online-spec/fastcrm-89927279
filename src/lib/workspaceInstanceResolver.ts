import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceStatus = "active" | "suspended" | "inactive" | "pending";

export interface WorkspaceInstanceData {
  id: string;
  workspace_id: string;
  supabase_url: string;
  supabase_anon_key: string;
  status: WorkspaceStatus;
  metadata: Record<string, unknown>;
}

export interface ControlPlaneConfig {
  url: string;
  enabled: boolean;
}

export interface ControlPlaneWorkspace {
  id: string;
  status: WorkspaceStatus;
  supabase_url: string;
  supabase_anon_key: string;
  metadata?: Record<string, unknown>;
}

export interface ControlPlaneResponse {
  success: boolean;
  workspace?: ControlPlaneWorkspace;
  error?: string;
}

export interface ResolveTargetDeps {
  /** Chama o Control Plane externo. Retorna `null` quando desactivado. */
  callControlPlane: (
    config: ControlPlaneConfig,
    workspaceId: string,
  ) => Promise<ControlPlaneResponse | null>;
  /** Lê fallback local em workspace_instances. */
  fetchLocalInstance: (
    workspaceId: string,
  ) => Promise<WorkspaceInstanceData | null>;
  /** Factory de clientes Supabase por (url, key). */
  createClient: (url: string, anonKey: string) => SupabaseClient<Database>;
  /** Cliente principal (fallback quando suspenso/sem config). */
  mainClient: SupabaseClient<Database>;
}

export interface ResolveTargetResult {
  client: SupabaseClient<Database>;
  instance: WorkspaceInstanceData | null;
  status: WorkspaceStatus;
  source: "control-plane" | "local" | "main-fallback";
  error?: string;
}

/**
 * Resolve, de forma determinística, qual o cliente Supabase a usar para
 * um workspace. Garante que workspaces suspensos/inactivos NUNCA recebem
 * um cliente apontado ao tenant (fallback obrigatório ao mainClient).
 */
export async function resolveWorkspaceTarget(
  workspaceId: string,
  config: ControlPlaneConfig | null,
  deps: ResolveTargetDeps,
): Promise<ResolveTargetResult> {
  if (!workspaceId) {
    return {
      client: deps.mainClient,
      instance: null,
      status: "active",
      source: "main-fallback",
    };
  }

  // 1) Control Plane (autoritativo quando activado)
  if (config?.enabled && config?.url) {
    const cp = await deps.callControlPlane(config, workspaceId);
    if (cp?.success && cp.workspace) {
      const ws = cp.workspace;
      if (ws.status === "suspended" || ws.status === "inactive") {
        return {
          client: deps.mainClient,
          instance: null,
          status: ws.status,
          source: "main-fallback",
        };
      }
      return {
        client: deps.createClient(ws.supabase_url, ws.supabase_anon_key),
        instance: {
          id: ws.id,
          workspace_id: workspaceId,
          supabase_url: ws.supabase_url,
          supabase_anon_key: ws.supabase_anon_key,
          status: ws.status,
          metadata: ws.metadata ?? {},
        },
        status: ws.status,
        source: "control-plane",
      };
    }
    // Erro do Control Plane: NÃO cair para tenant aleatório — devolve main.
    return {
      client: deps.mainClient,
      instance: null,
      status: "active",
      source: "main-fallback",
      error: cp?.error ?? "control-plane-no-response",
    };
  }

  // 2) Fallback local: workspace_instances
  const local = await deps.fetchLocalInstance(workspaceId);
  if (local) {
    if (local.status === "suspended" || local.status === "inactive") {
      return {
        client: deps.mainClient,
        instance: local,
        status: local.status,
        source: "main-fallback",
      };
    }
    return {
      client: deps.createClient(local.supabase_url, local.supabase_anon_key),
      instance: local,
      status: local.status,
      source: "local",
    };
  }

  // 3) Sem configuração: usar cliente principal
  return {
    client: deps.mainClient,
    instance: null,
    status: "active",
    source: "main-fallback",
  };
}
