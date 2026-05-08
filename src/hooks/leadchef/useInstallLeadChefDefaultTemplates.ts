import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LEADCHEF_DEFAULT_TEMPLATES } from "@/utils/leadchef/templates";
import { extractTemplateVariables } from "@/utils/leadchef/templateRenderer";

export function useInstallLeadChefDefaultTemplates() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      const rows = LEADCHEF_DEFAULT_TEMPLATES.map((t) => ({
        workspace_id: currentWorkspace.id,
        name: t.name,
        category: t.category,
        channel: "whatsapp",
        body: t.body,
        variables: extractTemplateVariables(t.body),
        is_active: true,
        is_default: true,
        created_by: user?.id ?? null,
      }));
      const { error } = await (supabase as any)
        .from("leadchef_message_templates")
        .insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["leadchef-message-templates"] });
      toast.success(`${n} templates padrão criados.`);
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao criar templates padrão."),
  });
}
