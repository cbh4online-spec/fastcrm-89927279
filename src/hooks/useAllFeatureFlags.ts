import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllWorkspaces } from "./useAllWorkspaces";
import { useMemo } from "react";

interface FeatureFlagRow {
  id: string;
  workspace_id: string;
  flag_key: string;
  enabled: boolean;
}

export interface FlagAdoption {
  flagKey: string;
  label: string;
  enabled: number;
  disabled: number;
  noRecord: number;
  total: number;
  rate: number;
}

const FLAG_META: Record<string, { label: string; description: string }> = {
  shell_v2: { label: "Shell V2", description: "Nova shell com sidebar colapsável" },
  nav_v2: { label: "Nav V2", description: "Navegação reorganizada por contexto" },
  marketplace: { label: "Marketplace", description: "Marketplace de integrações" },
  objects: { label: "Objects", description: "Módulo de objectos personalizados" },
  intelligence: { label: "Intelligence", description: "Painel de inteligência AI" },
};

export const ALL_FLAG_KEYS = Object.keys(FLAG_META);

export function useAllFeatureFlags() {
  const queryClient = useQueryClient();
  const { workspaces, isLoading: wsLoading } = useAllWorkspaces();

  const { data: allFlags, isLoading: flagsLoading } = useQuery({
    queryKey: ["all-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_feature_flags" as any)
        .select("id, workspace_id, flag_key, enabled");
      if (error) throw error;
      return (data as unknown as FeatureFlagRow[]) || [];
    },
  });

  const adoptionByFlag = useMemo(() => {
    const total = workspaces.length;
    if (!total) return [];

    return ALL_FLAG_KEYS.map((key): FlagAdoption => {
      const rows = allFlags?.filter((f) => f.flag_key === key) || [];
      const enabled = rows.filter((r) => r.enabled).length;
      const disabled = rows.filter((r) => !r.enabled).length;
      const noRecord = total - rows.length;
      return {
        flagKey: key,
        label: FLAG_META[key]?.label || key,
        enabled,
        disabled,
        noRecord,
        total,
        rate: total > 0 ? Math.round((enabled / total) * 100) : 0,
      };
    });
  }, [allFlags, workspaces]);

  const bulkToggle = useMutation({
    mutationFn: async ({
      flagKey,
      workspaceIds,
      enabled,
    }: {
      flagKey: string;
      workspaceIds: string[];
      enabled: boolean;
    }) => {
      const rows = workspaceIds.map((wid) => ({
        workspace_id: wid,
        flag_key: flagKey,
        enabled,
      }));
      const { error } = await supabase
        .from("workspace_feature_flags" as any)
        .upsert(rows as any, { onConflict: "workspace_id,flag_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-feature-flags"] });
    },
  });

  return {
    allFlags: allFlags || [],
    workspaces,
    adoptionByFlag,
    bulkToggle,
    isLoading: wsLoading || flagsLoading,
    flagMeta: FLAG_META,
  };
}
