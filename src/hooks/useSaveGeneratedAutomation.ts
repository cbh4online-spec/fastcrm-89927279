import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GeneratedAutomation {
  name: string;
  description: string;
  trigger: string;
  trigger_config?: Record<string, unknown>;
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  explanation: string;
  natural_language_summary: string;
}

export function useSaveGeneratedAutomation() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (automation: GeneratedAutomation) => {
      if (!currentWorkspace) throw new Error("Sem workspace ativo");

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("journey_automations")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: userData.user.id,
          name: automation.name,
          description: automation.description,
          trigger_type: automation.trigger,
          trigger_config: (automation.trigger_config || {}) as any,
          conditions: (automation.conditions || []) as any,
          actions: (automation.actions || []) as any,
          is_active: false,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Automação guardada com sucesso!");
      navigate("/dashboard/automations");
    },
    onError: (error) => {
      console.error("Erro ao guardar automação:", error);
      toast.error("Erro ao guardar automação. Tente novamente.");
    },
  });
}
