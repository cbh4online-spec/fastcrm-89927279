import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { extractTemplateVariables } from "@/utils/leadchef/templateRenderer";

interface Input {
  name: string;
  category: string;
  channel?: string;
  body: string;
  is_active?: boolean;
}

export function useCreateLeadChefMessageTemplate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Input) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      if (!input.name?.trim()) throw new Error("Nome obrigatório.");
      if (!input.body || input.body.trim().length < 5)
        throw new Error("Mensagem demasiado curta.");

      const variables = extractTemplateVariables(input.body);

      const { data, error } = await (supabase as any)
        .from("leadchef_message_templates")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name.trim(),
          category: input.category,
          channel: input.channel ?? "whatsapp",
          body: input.body,
          variables,
          is_active: input.is_active ?? true,
          is_default: false,
          created_by: user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-message-templates"] });
      toast.success("Template criado.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível guardar o template."),
  });
}
