import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const supabase = _supabase as any;

export const SAAS_PLAN_OPTIONS = [
  { value: "starter", label: "Starter (Free)" },
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "agency", label: "Agency" },
] as const;

export const SAAS_STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "trialing", label: "Trial (14 dias)" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Cancelado" },
] as const;

export interface ChangePlanInput {
  workspaceId: string;
  plan: string;
  subStatus?: string;
  /** ISO string */
  trialEnd?: string;
  /** ISO string */
  periodEnd?: string;
}

export interface AssignCreditsInput {
  workspaceId: string;
  amount: number;
  description: string;
}

/**
 * Ações administrativas de SaaS partilhadas entre o backoffice clássico
 * (/super-admin) e o Backoffice V2 (/super-admin-v2).
 *
 * Segurança: as escritas dependem de RLS + is_super_admin no backend;
 * o frontend apenas expõe as ações dentro de ecrãs protegidos.
 */
export function useSaasAdminActions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["super-admin-workspaces"] });
    queryClient.invalidateQueries({ queryKey: ["backoffice-v2", "billing"] });
    queryClient.invalidateQueries({ queryKey: ["backoffice-v2", "workspaces"] });
    queryClient.invalidateQueries({ queryKey: ["backoffice-v2"] });
  };

  const changePlan = useMutation({
    mutationFn: async ({ workspaceId, plan, subStatus, trialEnd, periodEnd }: ChangePlanInput) => {
      const { data: existingSub } = await supabase
        .from("workspace_subscriptions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      const updateData: Record<string, any> = {
        plan,
        updated_at: new Date().toISOString(),
      };
      if (subStatus) updateData.status = subStatus;
      if (subStatus === "trialing") {
        updateData.trial_started_at = new Date().toISOString();
        updateData.trial_ends_at =
          trialEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        updateData.current_period_end = updateData.trial_ends_at;
      } else {
        if (trialEnd === "") {
          updateData.trial_ends_at = null;
          updateData.trial_started_at = null;
        }
        if (periodEnd) updateData.current_period_end = periodEnd;
      }

      if (existingSub) {
        const { error } = await supabase
          .from("workspace_subscriptions")
          .update(updateData)
          .eq("workspace_id", workspaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workspace_subscriptions").insert([
          {
            workspace_id: workspaceId,
            plan,
            status: subStatus || "active",
            current_period_start: new Date().toISOString(),
            current_period_end:
              periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_started_at: subStatus === "trialing" ? new Date().toISOString() : null,
            trial_ends_at:
              subStatus === "trialing"
                ? trialEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                : null,
          },
        ]);
        if (error) throw error;
      }

      await supabase.rpc("log_admin_action", {
        p_action_type: "plan_changed",
        p_target_type: "workspace",
        p_target_id: workspaceId,
        p_workspace_id: workspaceId,
        p_details: {
          new_plan: plan,
          new_status: subStatus,
          trial_end: trialEnd,
          period_end: periodEnd,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Plano alterado com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao alterar plano: " + (error?.message ?? "desconhecido"));
    },
  });

  const assignCredits = useMutation({
    mutationFn: async ({ workspaceId, amount, description }: AssignCreditsInput) => {
      if (!user) throw new Error("Não autenticado");
      // eslint-disable-next-line no-restricted-syntax -- baseline: docs/security/credits-frontend-hardening.md (legítimo: super-admin protegido por is_super_admin + RLS)
      const { data, error } = await supabase.rpc("admin_assign_credits", {
        p_workspace_id: workspaceId,
        p_admin_user_id: user.id,
        p_credits_amount: amount,
        p_description: description || "Créditos atribuídos manualmente pelo admin",
      });
      if (error) throw error;
      const result = (data as unknown as Array<{
        success: boolean;
        new_balance: number;
        message: string;
      }>)?.[0];
      if (!result?.success) throw new Error(result?.message || "Erro ao atribuir créditos");
      return result;
    },
    onSuccess: (result) => {
      invalidate();
      toast.success(result?.message ?? "Créditos atualizados");
    },
    onError: (error: any) => {
      toast.error("Erro ao atribuir créditos: " + (error?.message ?? "desconhecido"));
    },
  });

  return { changePlan, assignCredits };
}
