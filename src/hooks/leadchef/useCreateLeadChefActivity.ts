import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LeadChefActivityType } from "@/types/leadchef";

interface Input {
  leadId: string;
  type: LeadChefActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export function useCreateLeadChefActivity() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      const { data, error } = await supabase
        .from("crm_activities")
        .insert({
          workspace_id: currentWorkspace.id,
          entity_type: "lead",
          entity_id: input.leadId,
          lead_id: input.leadId,
          activity_type: input.type,
          title: input.title,
          description: input.description || null,
          metadata: { source: "leadchef", ...(input.metadata || {}) },
          performed_by: user?.id || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["leadchef-activities", currentWorkspace?.id, vars.leadId] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Atividade registada.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao registar atividade."),
  });
}
