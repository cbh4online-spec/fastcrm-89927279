import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LEADCHEF_DEFAULT_MODULES = [
  "today","leads","agenda","clientes","referencias","objetivos",
  "equipa","templates","automacoes","sequencias","relatorios",
  "inteligencia","notificacoes","ferramentas",
] as const;

export type LeadChefModuleKey = typeof LEADCHEF_DEFAULT_MODULES[number];

export interface LeadChefAppConfig {
  workspace_id: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  enabled_modules: string[];
  features: Record<string, unknown>;
  onboarding: Record<string, unknown>;
  updated_at?: string;
}

const TABLE = "leadchef_app_config" as const;

export function useLeadChefAppConfig(workspaceId?: string | null) {
  return useQuery({
    queryKey: ["leadchef-app-config", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefAppConfig | null> => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data as unknown as LeadChefAppConfig) ?? null;
    },
    staleTime: 60_000,
  });
}

export function useUpsertLeadChefAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeadChefAppConfig> & { workspace_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...input, updated_by: user?.id ?? null };
      const { data, error } = await supabase
        .from(TABLE as any)
        .upsert(payload as any, { onConflict: "workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LeadChefAppConfig;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["leadchef-app-config", vars.workspace_id] });
    },
  });
}
