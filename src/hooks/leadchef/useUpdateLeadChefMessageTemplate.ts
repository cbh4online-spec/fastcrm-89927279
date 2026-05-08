import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractTemplateVariables } from "@/utils/leadchef/templateRenderer";

interface Input {
  id: string;
  name?: string;
  category?: string;
  channel?: string;
  body?: string;
  is_active?: boolean;
}

export function useUpdateLeadChefMessageTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) => {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.category !== undefined) patch.category = input.category;
      if (input.channel !== undefined) patch.channel = input.channel;
      if (input.body !== undefined) {
        if (input.body.trim().length < 5) throw new Error("Mensagem demasiado curta.");
        patch.body = input.body;
        patch.variables = extractTemplateVariables(input.body);
      }
      if (input.is_active !== undefined) patch.is_active = input.is_active;

      const { data, error } = await (supabase as any)
        .from("leadchef_message_templates")
        .update(patch)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-message-templates"] });
      qc.invalidateQueries({ queryKey: ["leadchef-message-template"] });
      toast.success("Template atualizado.");
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao atualizar template."),
  });
}
