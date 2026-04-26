import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Mutations administrativas seguras para Utilizadores (Backoffice V2 — Fase 2F.2).
 *
 * Todas as mutations são executadas via edge function `admin-user-action`,
 * que valida super admin server-side, regista auditoria e impede:
 *  - auto-ação do próprio super admin
 *  - ações sobre outros super admins
 */

type ActionResponse = {
  ok: boolean;
  action: string;
  user: {
    id: string;
    user_id: string;
    email: string | null;
    full_name: string | null;
    status: string | null;
  };
  audit_logged: boolean;
};

async function invokeAction(body: {
  target_user_id: string;
  action: "deactivate_user" | "reactivate_user";
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResponse> {
  const { data, error } = await supabase.functions.invoke<ActionResponse>(
    "admin-user-action",
    { body },
  );
  if (error) {
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

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { targetUserId: string; reason: string }) => {
      const reason = params.reason.trim();
      if (reason.length < 3) throw new Error("reason_required");
      return invokeAction({
        target_user_id: params.targetUserId,
        action: "deactivate_user",
        reason,
      });
    },
    onSuccess: (_d, vars) => {
      toast.success("Acesso do utilizador suspenso.");
      qc.invalidateQueries({ queryKey: ["wsv2-users-admin"] });
      qc.invalidateQueries({ queryKey: ["wsv2-user-audit", vars.targetUserId] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível suspender o acesso.", {
        description: friendlyError(err?.message),
      });
    },
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { targetUserId: string; reason: string }) => {
      const reason = params.reason.trim();
      if (reason.length < 3) throw new Error("reason_required");
      return invokeAction({
        target_user_id: params.targetUserId,
        action: "reactivate_user",
        reason,
      });
    },
    onSuccess: (_d, vars) => {
      toast.success("Acesso do utilizador reativado.");
      qc.invalidateQueries({ queryKey: ["wsv2-users-admin"] });
      qc.invalidateQueries({ queryKey: ["wsv2-user-audit", vars.targetUserId] });
    },
    onError: (err: any) => {
      toast.error("Não foi possível reativar o acesso.", {
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
    case "user_not_found": return "Utilizador não encontrado.";
    case "cannot_target_self": return "Não podes executar esta ação sobre a tua própria conta.";
    case "cannot_target_super_admin": return "Não é permitido executar esta ação sobre outro super admin.";
    case "no_state_change": return "O utilizador já se encontra nesse estado.";
    case "invalid_target_user_id": return "Identificador de utilizador inválido.";
    case "invalid_action": return "Ação não suportada.";
    default: return code ?? "Verifica permissões e tenta novamente.";
  }
}
