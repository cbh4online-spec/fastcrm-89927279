import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";

export interface WhatsAppSettings {
  id: string;
  workspace_id: string;
  autopilot_enabled: boolean;
  ai_persona: string;
  welcome_message: string;
  away_message: string;
  business_hours_only: boolean;
  auto_create_leads: boolean;
  notify_on_new_message: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<WhatsAppSettings, "id" | "workspace_id" | "created_at" | "updated_at"> = {
  autopilot_enabled: false,
  ai_persona: "",
  welcome_message: "",
  away_message: "",
  business_hours_only: false,
  auto_create_leads: true,
  notify_on_new_message: true,
};

export function useWhatsAppSettings() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["whatsapp-settings", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data, error } = await workspaceClient
        .from("whatsapp_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      if (error) throw error;
      return (data as WhatsAppSettings | null) ?? { ...DEFAULT_SETTINGS, workspace_id: currentWorkspace.id } as any;
    },
    enabled: !!currentWorkspace,
  });
}

export function useSaveWhatsAppSettings() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<WhatsAppSettings, "id" | "created_at" | "updated_at">>) => {
      if (!currentWorkspace) throw new Error("No workspace");
      const payload = {
        ...settings,
        workspace_id: currentWorkspace.id,
        updated_at: new Date().toISOString(),
      };

      // Try update first, then insert
      const { data: existing } = await workspaceClient
        .from("whatsapp_settings")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (existing) {
        const { error } = await workspaceClient
          .from("whatsapp_settings")
          .update(payload)
          .eq("workspace_id", currentWorkspace.id);
        if (error) throw error;
      } else {
        const { error } = await workspaceClient
          .from("whatsapp_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings", currentWorkspace?.id] });
      toast.success("Definições WhatsApp guardadas");
    },
    onError: (err: any) => {
      toast.error("Erro ao guardar: " + err.message);
    },
  });
}
