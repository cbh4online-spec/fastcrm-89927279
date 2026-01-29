/**
 * Hook for managing Autopilot Configuration
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { AutopilotConfig, AutopilotConfigInsert, AutopilotConfigUpdate } from "@/types/conversational-engine";

export function useAutopilotConfig(channel?: string) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["autopilot-config", currentWorkspace?.id, channel],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      
      let query = supabase
        .from("autopilot_config")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (channel) {
        query = query.eq("channel", channel);
      } else {
        query = query.eq("config_scope", "workspace");
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data as AutopilotConfig | null;
    },
    enabled: !!currentWorkspace?.id,
  });

  const { data: allConfigs = [] } = useQuery({
    queryKey: ["autopilot-configs-all", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from("autopilot_config")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("config_scope")
        .order("channel");

      if (error) throw error;
      return data as AutopilotConfig[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const upsertConfig = useMutation({
    mutationFn: async (configData: Omit<AutopilotConfigInsert, "workspace_id" | "created_by">) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Workspace ou utilizador não selecionado");

      // Check if config exists
      const existing = await supabase
        .from("autopilot_config")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("config_scope", configData.config_scope || "workspace")
        .eq("channel", configData.channel || null)
        .maybeSingle();

      if (existing.data) {
        // Update
        const { data, error } = await supabase
          .from("autopilot_config")
          .update(configData)
          .eq("id", existing.data.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("autopilot_config")
          .insert({
            ...configData,
            workspace_id: currentWorkspace.id,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-config"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-configs-all"] });
      toast.success("Configuração do Auto-Pilot guardada");
    },
    onError: (error) => {
      toast.error("Erro ao guardar: " + error.message);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!config?.id) throw new Error("Configuração não encontrada");

      const { error } = await supabase
        .from("autopilot_config")
        .update({ is_active: isActive })
        .eq("id", config.id);

      if (error) throw error;
    },
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-config"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-configs-all"] });
      toast.success(isActive ? "Auto-Pilot ativado" : "Auto-Pilot desativado");
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("autopilot_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-config"] });
      queryClient.invalidateQueries({ queryKey: ["autopilot-configs-all"] });
      toast.success("Configuração eliminada");
    },
    onError: (error) => {
      toast.error("Erro ao eliminar: " + error.message);
    },
  });

  // Default values for new config
  const defaultConfig: Partial<AutopilotConfigInsert> = {
    is_active: false,
    config_scope: "workspace",
    response_delay_min: 8,
    response_delay_max: 12,
    typing_indicator: true,
    max_messages_per_conversation: 25,
    max_consecutive_bot_messages: 3,
    sleep_on_human_reply: true,
    auto_reactivate: true,
    reactivation_hours: 24,
    respect_working_hours: false,
    working_hours_start: "09:00",
    working_hours_end: "18:00",
    working_days: [1, 2, 3, 4, 5],
    timezone: "Europe/Lisbon",
    accept_images: true,
    accept_voice: true,
    accept_files: true,
    require_human_after_escalation: true,
  };

  return {
    config,
    allConfigs,
    isLoading,
    defaultConfig,
    upsertConfig: upsertConfig.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    deleteConfig: deleteConfig.mutateAsync,
    isSaving: upsertConfig.isPending,
    isActive: config?.is_active ?? false,
  };
}
