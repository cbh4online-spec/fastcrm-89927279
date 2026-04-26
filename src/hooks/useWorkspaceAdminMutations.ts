import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Mutations seguras para administração de workspaces (Backoffice V2).
 *
 * Segurança:
 * - Todas as operações dependem de RLS (`is_super_admin(auth.uid())` em
 *   `workspaces` e `admin_audit_logs`). O frontend nunca é a fonte de
 *   confiança — RLS bloqueia se o utilizador não for super admin.
 * - Não há operações destrutivas nesta fase (sem DELETE, sem alterações
 *   de plano/Stripe). Apenas mudança de estado e metadados não-críticos.
 * - Todas as ações registam um evento em `admin_audit_logs` com o estado
 *   anterior e o novo estado, em formato jsonb.
 */

export type WorkspaceMetadataPatch = {
  name?: string;
  company_name?: string | null;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão inválida");
  return data.user.id;
}

async function writeAuditLog(params: {
  adminUserId: string;
  actionType: string;
  workspaceId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}) {
  // Best-effort: se a auditoria falhar não revertemos a mutation, mas
  // mostramos aviso ao operador. RLS garante que só super admins escrevem.
  const { error } = await supabase.from("admin_audit_logs").insert([
    {
      admin_user_id: params.adminUserId,
      action_type: params.actionType,
      target_type: "workspace",
      target_id: params.workspaceId,
      workspace_id: params.workspaceId,
      details: { before: params.before, after: params.after } as any,
    },
  ]);
  if (error) {
    console.warn("[admin-audit] falhou:", error.message);
    toast.warning("Ação executada, mas o registo de auditoria falhou.");
  }
}

export function useSuspendWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workspace: { id: string; status: string | null }) => {
      const adminUserId = await getCurrentUserId();
      const { data, error } = await supabase
        .from("workspaces")
        .update({ status: "suspended" })
        .eq("id", workspace.id)
        .select("id, status")
        .single();
      if (error) throw error;
      await writeAuditLog({
        adminUserId,
        actionType: "workspace.suspend",
        workspaceId: workspace.id,
        before: { status: workspace.status },
        after: { status: data.status },
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Workspace suspenso.");
      qc.invalidateQueries({ queryKey: ["wsv2-workspaces-admin"] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível suspender o workspace.", {
        description: err?.message ?? "Verifica permissões e tenta novamente.",
      });
    },
  });
}

export function useReactivateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workspace: { id: string; status: string | null }) => {
      const adminUserId = await getCurrentUserId();
      const { data, error } = await supabase
        .from("workspaces")
        .update({ status: "active" })
        .eq("id", workspace.id)
        .select("id, status")
        .single();
      if (error) throw error;
      await writeAuditLog({
        adminUserId,
        actionType: "workspace.reactivate",
        workspaceId: workspace.id,
        before: { status: workspace.status },
        after: { status: data.status },
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Workspace reativado.");
      qc.invalidateQueries({ queryKey: ["wsv2-workspaces-admin"] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível reativar o workspace.", {
        description: err?.message ?? "Verifica permissões e tenta novamente.",
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

      const adminUserId = await getCurrentUserId();
      const { data, error } = await supabase
        .from("workspaces")
        .update(cleanPatch)
        .eq("id", workspace.id)
        .select("id, name, company_name")
        .single();
      if (error) throw error;

      await writeAuditLog({
        adminUserId,
        actionType: "workspace.update_metadata",
        workspaceId: workspace.id,
        before: { name: workspace.name, company_name: workspace.company_name },
        after: { name: data.name, company_name: data.company_name },
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Metadados atualizados.");
      qc.invalidateQueries({ queryKey: ["wsv2-workspaces-admin"] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível atualizar.", {
        description: err?.message ?? "Verifica permissões e tenta novamente.",
      });
    },
  });
}
