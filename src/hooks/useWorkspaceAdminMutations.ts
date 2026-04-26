import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Mutations administrativas seguras para Workspaces (Backoffice V2).
 *
 * Fase 2F.1 — todas as mutations são executadas via edge function
 * `admin-workspace-action`, que:
 *  - Valida JWT do chamador e confirma is_super_admin server-side.
 *  - Captura IP/User-Agent do pedido.
 *  - Aplica a mutation com service role.
 *  - Regista evento em `admin_audit_logs` com before/after + reason.
 *
 * O frontend nunca faz UPDATE direto à tabela workspaces para estas ações.
 */

export type WorkspaceMetadataPatch = {
  name?: string;
  company_name?: string | null;
};

type ActionResponse = {
  ok: boolean;
  action: string;
  workspace: { id: string; name: string; company_name: string | null; status: string | null };
  audit_logged: boolean;
};

async function invokeAction(body: {
  workspace_id: string;
  action: "suspend_workspace" | "reactivate_workspace" | "update_metadata";
  reason?: string;
  payload?: Record<string, unknown>;
}): Promise<ActionResponse> {
  const { data, error } = await supabase.functions.invoke<ActionResponse>(
    "admin-workspace-action",
    { body },
  );
  if (error) {
    // Erros HTTP da edge function — tentar extrair mensagem útil
    const ctx: any = (error as any).context;
    let msg = error.message;
    try {
      if (ctx?.body) {
        const parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
        if (parsed?.error) msg = String(parsed.error);
      }
    } catch { /* noop */ }
    throw new Error(msg);
  }
  if (!data?.ok) throw new Error("Resposta inválida do servidor.");
  return data;
}

export function useSuspendWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: string | null; reason: string }) => {
      const reason = params.reason.trim();
      if (reason.length < 3) throw new Error("Indica um motivo (mínimo 3 caracteres).");
      return invokeAction({
        workspace_id: params.id,
        action: "suspend_workspace",
        reason,
      });
    },
    onSuccess: (_d, vars) => {
      toast.success("Workspace suspenso.");
      qc.invalidateQueries({ queryKey: ["wsv2-workspaces-admin"] });
      qc.invalidateQueries({ queryKey: ["wsv2-workspace-audit", vars.id] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível suspender o workspace.", {
        description: friendlyError(err?.message),
      });
    },
  });
}

export function useReactivateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: string | null; reason: string }) => {
      const reason = params.reason.trim();
      if (reason.length < 3) throw new Error("Indica um motivo (mínimo 3 caracteres).");
      return invokeAction({
        workspace_id: params.id,
        action: "reactivate_workspace",
        reason,
      });
    },
    onSuccess: (_d, vars) => {
      toast.success("Workspace reativado.");
      qc.invalidateQueries({ queryKey: ["wsv2-workspaces-admin"] });
      qc.invalidateQueries({ queryKey: ["wsv2-workspace-audit", vars.id] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível reativar o workspace.", {
        description: friendlyError(err?.message),
      });
    },
  });
}

export function useUpdateWorkspaceMetadata() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workspace: { id: string; name: string; company_name: string | null };
      patch: WorkspaceMetadataPatch;
    }) => {
      const { workspace, patch } = params;
      const cleanPatch: WorkspaceMetadataPatch = {};
      if (typeof patch.name === "string") {
        const v = patch.name.trim();
        if (!v) throw new Error("O nome não pode ficar vazio.");
        if (v.length > 120) throw new Error("Nome demasiado longo (máx. 120).");
        cleanPatch.name = v;
      }
      if (patch.company_name !== undefined) {
        const v = patch.company_name?.trim() ?? "";
        if (v.length > 200) throw new Error("Empresa demasiado longa (máx. 200).");
        cleanPatch.company_name = v ? v : null;
      }
      if (Object.keys(cleanPatch).length === 0) {
        throw new Error("Sem alterações para guardar.");
      }
      return invokeAction({
        workspace_id: workspace.id,
        action: "update_metadata",
        payload: cleanPatch as Record<string, unknown>,
      });
    },
    onSuccess: (_d, vars) => {
      toast.success("Metadados atualizados.");
      qc.invalidateQueries({ queryKey: ["wsv2-workspaces-admin"] });
      qc.invalidateQueries({ queryKey: ["wsv2-workspace-audit", vars.workspace.id] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível atualizar.", {
        description: friendlyError(err?.message),
      });
    },
  });
}

function friendlyError(code?: string): string {
  switch (code) {
    case "forbidden": return "Apenas super admins podem executar esta ação.";
    case "invalid_session": return "Sessão inválida — faz login novamente.";
    case "reason_required": return "Indica um motivo (mínimo 3 caracteres).";
    case "workspace_not_found": return "Workspace não encontrado.";
    case "no_changes": return "Sem alterações para guardar.";
    case "invalid_name": return "Nome inválido (1–120 caracteres).";
    case "invalid_company_name": return "Empresa inválida (máx. 200 caracteres).";
    default: return code ?? "Verifica permissões e tenta novamente.";
  }
}
