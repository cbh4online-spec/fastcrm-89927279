import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LeadChefGoal } from "@/types/leadchef";

export interface UpsertLeadChefGoalInput {
  period_month: string; // YYYY-MM-DD (dia 1 do mês)
  leads_goal?: number;
  contacts_goal?: number;
  demos_goal?: number;
  sales_goal?: number;
  referrals_goal?: number;
  recruitment_goal?: number;
  income_goal?: number;
  notes?: string | null;
}

const safeNum = (v: number | undefined) => Math.max(0, Number.isFinite(v as number) ? Number(v) : 0);

export function useUpsertLeadChefGoal() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpsertLeadChefGoalInput): Promise<LeadChefGoal> => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      if (!user?.id) throw new Error("Sessão expirada. Faz login novamente.");

      const payload = {
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        period_month: input.period_month,
        leads_goal: safeNum(input.leads_goal),
        contacts_goal: safeNum(input.contacts_goal),
        demos_goal: safeNum(input.demos_goal),
        sales_goal: safeNum(input.sales_goal),
        referrals_goal: safeNum(input.referrals_goal),
        recruitment_goal: safeNum(input.recruitment_goal),
        income_goal: safeNum(input.income_goal),
        notes: input.notes ?? null,
      };

      const { data, error } = await (supabase as any)
        .from("leadchef_goals")
        .upsert(payload, { onConflict: "workspace_id,user_id,period_month" })
        .select("*")
        .single();
      if (error) throw error;
      return data as LeadChefGoal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-goals"] });
      qc.invalidateQueries({ queryKey: ["leadchef-monthly-progress"] });
      qc.invalidateQueries({ queryKey: ["leadchef-dashboard"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Objetivos guardados.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível guardar os objetivos."),
  });
}
