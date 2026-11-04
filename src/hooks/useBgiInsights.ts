import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { BgiPeriod } from "@/hooks/useBgiIndicators";
import { insightsSchema, type BgiInsights } from "@/lib/bgi/insightsSchema";

export interface SavedInsight { id: string; content: BgiInsights; created_at: string; created_by: string | null; model: string }

export function useBgiInsights(period: BgiPeriod, periodStart: string | undefined, anchor: string | null) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();
  const key = ["bgi-insights", wsId, period, periodStart];

  const query = useQuery({
    queryKey: key,
    enabled: !!wsId && !!periodStart,
    queryFn: async (): Promise<SavedInsight | null> => {
      const { data, error } = await supabase.from("bgi_ai_insights")
        .select("id, content, created_at, created_by, model")
        .eq("workspace_id", wsId!).eq("period_type", period).eq("period_start", periodStart!)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const parsed = insightsSchema.safeParse(data.content);
      return parsed.success ? { ...data, content: parsed.data } : null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!wsId) throw new Error("Workspace não encontrado");
      const { data, error } = await supabase.functions.invoke("bgi-insights", { body: { workspaceId: wsId, period, anchor } });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
        throw new Error(body?.message ?? "Não foi possível gerar a análise");
      }
      if (!data?.ok) throw new Error(data?.message ?? "Não foi possível gerar a análise");
      return data as { remaining: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, generate };
}
