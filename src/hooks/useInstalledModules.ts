import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface InstalledModule {
  id: string;
  status: string;
  pricing_model: string | null;
  price_eur: number | null;
  stripe_sub_id: string | null;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  cancel_at_period_end: boolean | null;
  current_period_start: string | null;
  current_period_end: string | null;
  module: {
    id: string;
    slug: string;
    name: string;
    icon: string;
    category: string;
    pricing_model: string;
    price_eur: number;
  };
}

export interface InstalledModulesSummary {
  total_installed: number;
  active: number;
  monthly_cost_eur: number;
  free_modules: number;
  paid_modules: number;
}

export function useInstalledModules() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["installed-modules", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { installations: [], summary: null };

      const { data, error } = await supabase.functions.invoke("module-usage-stats", {
        body: { workspaceId },
      });

      if (error) throw error;
      return data as {
        installations: InstalledModule[];
        summary: InstalledModulesSummary;
      };
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });

  const installedSlugs = (query.data?.installations || [])
    .filter(i => i.status === "active" || i.status === "trial")
    .map(i => i.module?.slug)
    .filter(Boolean) as string[];

  return {
    installations: query.data?.installations || [],
    summary: query.data?.summary || null,
    installedSlugs,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
