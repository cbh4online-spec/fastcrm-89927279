import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { LeadChefAppointment } from "@/types/leadchef";

interface Input {
  id: string;
  patch: Partial<
    Pick<
      LeadChefAppointment,
      "title" | "notes" | "scheduled_at" | "duration_minutes" | "location" | "is_online" | "type" | "metadata"
    >
  >;
}

export function useUpdateLeadChefAppointment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ id, patch }: Input) => {
      if (!workspaceId) throw new Error("Workspace não selecionado.");
      const { error } = await (supabase as any)
        .from("leadchef_appointments")
        .update(patch)
        .eq("id", id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-agenda"] });
      qc.invalidateQueries({ queryKey: ["leadchef-today"] });
      toast.success("Compromisso atualizado.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao atualizar compromisso."),
  });
}
