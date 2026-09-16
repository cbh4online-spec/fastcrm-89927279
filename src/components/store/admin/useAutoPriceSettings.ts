import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  DEFAULT_MAX_DROP_PCT,
  DEFAULT_MIN_MARGIN_PCT,
  DEFAULT_UNDERCUT_PCT,
} from "@/lib/pricing/undercutPricing";

export interface AutoPriceSettings {
  workspace_id: string;
  enabled: boolean;
  undercut_pct: number;
  max_drop_pct: number;
  default_min_margin_pct: number;
  paused_reason: string | null;
  last_run_at: string | null;
}

export function useAutoPriceSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["store-auto-price-settings", workspaceId],
    queryFn: async (): Promise<AutoPriceSettings | null> => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("store_auto_price_settings")
        .select("workspace_id, enabled, undercut_pct, max_drop_pct, default_min_margin_pct, paused_reason, last_run_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return (data as AutoPriceSettings | null) ?? null;
    },
    enabled: !!workspaceId,
  });

  const saveSettings = useMutation({
    mutationFn: async (patch: Partial<Omit<AutoPriceSettings, "workspace_id">>) => {
      if (!workspaceId) throw new Error("Sem espaço de trabalho ativo");
      const { error } = await supabase.from("store_auto_price_settings").upsert(
        {
          workspace_id: workspaceId,
          enabled: patch.enabled ?? settings?.enabled ?? false,
          undercut_pct: patch.undercut_pct ?? settings?.undercut_pct ?? DEFAULT_UNDERCUT_PCT,
          max_drop_pct: patch.max_drop_pct ?? settings?.max_drop_pct ?? DEFAULT_MAX_DROP_PCT,
          default_min_margin_pct:
            patch.default_min_margin_pct ?? settings?.default_min_margin_pct ?? DEFAULT_MIN_MARGIN_PCT,
          paused_reason: patch.paused_reason ?? null,
        },
        { onConflict: "workspace_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-auto-price-settings", workspaceId] });
      toast.success("Configuração de preço automático guardada");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível guardar"),
  });

  const toggleExcluded = useMutation({
    mutationFn: async ({ productId, excluded }: { productId: string; excluded: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ auto_price_excluded: excluded })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar o produto"),
  });

  return { settings, isLoading, saveSettings, toggleExcluded };
}
