// Legacy functions kept for backward compatibility
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useCreateAbsence() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: {
      employee_id: string;
      absence_type_id: string;
      start_date: string;
      end_date: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.from("hr_absences" as any).insert({ ...values, workspace_id: wsId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pedido de ausência criado");
      queryClient.invalidateQueries({ queryKey: ["hr-absences"] });
    },
    onError: () => toast.error("Erro ao criar pedido"),
  });
}

export function useApproveAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ absence_id, action, rejection_reason }: { absence_id: string; action: "approved" | "rejected"; rejection_reason?: string }) => {
      const res = await supabase.functions.invoke("hr-absence-approve", { body: { absence_id, action, rejection_reason } });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "approved" ? "Ausência aprovada" : "Ausência rejeitada");
      queryClient.invalidateQueries({ queryKey: ["hr-absences"] });
    },
    onError: () => toast.error("Erro ao processar pedido"),
  });
}

export function useSeedAbsenceDefaults() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("hr-seed-defaults", {
        body: { workspace_id: currentWorkspace?.id }
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr-absence-types"] }),
  });
}
