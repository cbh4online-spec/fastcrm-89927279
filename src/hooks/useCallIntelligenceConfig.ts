import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface CallIntelligenceConfig {
  auto_record_mode: "all" | "external" | "none";
  transcription_enabled: boolean;
  transcription_language: string;
  ai_summary_enabled: boolean;
  consent_notification: boolean;
  crm_auto_link: boolean;
  retention_days: number;
  default_insights_template: string | null;
}

const DEFAULT_CONFIG: CallIntelligenceConfig = {
  auto_record_mode: "none",
  transcription_enabled: true,
  transcription_language: "pt",
  ai_summary_enabled: true,
  consent_notification: true,
  crm_auto_link: true,
  retention_days: 90,
  default_insights_template: null,
};

export function useCallIntelligenceConfig() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const { t } = useTranslation("settings");
  const workspaceId = currentWorkspace?.id;

  const { data: config, isLoading } = useQuery({
    queryKey: ["call-intelligence-config", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return DEFAULT_CONFIG;

      const { data, error } = await supabase
        .from("workspace_call_intelligence_config" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_CONFIG;

      return {
        auto_record_mode: (data as any).auto_record_mode as CallIntelligenceConfig["auto_record_mode"],
        transcription_enabled: (data as any).transcription_enabled as boolean,
        transcription_language: (data as any).transcription_language as string,
        ai_summary_enabled: (data as any).ai_summary_enabled as boolean,
        consent_notification: (data as any).consent_notification as boolean,
        crm_auto_link: (data as any).crm_auto_link as boolean,
        retention_days: (data as any).retention_days as number,
        default_insights_template: (data as any).default_insights_template as string | null,
      } satisfies CallIntelligenceConfig;
    },
    enabled: !!workspaceId,
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<CallIntelligenceConfig>) => {
      if (!workspaceId) throw new Error("No workspace");

      const payload = { ...updates, workspace_id: workspaceId, updated_at: new Date().toISOString() };

      const { data: existing } = await supabase
        .from("workspace_call_intelligence_config" as any)
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("workspace_call_intelligence_config" as any)
          .update(payload as any)
          .eq("workspace_id", workspaceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_call_intelligence_config" as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-intelligence-config", workspaceId] });
      toast.success(t("callIntel_saved"));
    },
    onError: () => {
      toast.error(t("saveFailed"));
    },
  });

  return { config: config ?? DEFAULT_CONFIG, isLoading, updateConfig };
}
