import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export type LeadChefCycleKey =
  | "demo"
  | "post_sale_visit"
  | "cooking_class"
  | "custom_visit"
  | "proposal"
  | "sale"
  | "referrals"
  | "recruitment";

export interface LeadChefCycleEntry {
  done: boolean;
  date?: string | null;
}

export type LeadChefCycle = Partial<Record<LeadChefCycleKey, LeadChefCycleEntry>>;

interface Input {
  profileId: string;
  cycle: LeadChefCycle;
}

export function useUpdateLeadChefCycle() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      const { error } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .update({ cycle: input.cycle })
        .eq("id", input.profileId)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-lead"] });
      qc.invalidateQueries({ queryKey: ["leadchef-leads"] });
      toast.success("Ciclo atualizado.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao atualizar ciclo."),
  });
}
