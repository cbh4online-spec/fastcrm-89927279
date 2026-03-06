import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface DailyBrief {
  id: string;
  workspace_id: string;
  created_at: string;
  summary: string | null;
  hot_leads: string | null;
  stuck_deals: string | null;
  revenue_highlight: string | null;
  action_suggestions: string[] | null;
  key_metrics: {
    leads_today?: number;
    revenue_today?: number;
    new_opportunities?: number;
    deals_won?: number;
    deals_lost?: number;
    deals_stalled?: number;
    tasks_completed?: number;
    tasks_pending?: number;
    messages_today?: number;
  } | null;
}

export function useDailyBrief() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const queryKey = ["daily-briefs", currentWorkspace?.id];

  const { data: briefs = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from("daily_briefs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(7);
      if (error) throw error;
      return data as DailyBrief[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
  });

  const generateDailyBrief = async () => {
    if (!currentWorkspace?.id) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-revenue-brief", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else if (data.error.includes("Credits")) {
          toast.error("Créditos AI esgotados.");
        } else {
          toast.error(data.error);
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Daily Brief gerado com sucesso!");
      console.log("[STRATEGY-BRIEF] Daily brief generated successfully", { workspace_id: currentWorkspace.id });
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: "STRATEGIC_BRIEF.GENERATED",
        entity_kind: "daily_brief",
        entity_id: currentWorkspace.id,
        source_module: "strategy-brief",
        payload: { trigger: "manual" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar daily brief";
      console.error("[STRATEGY-BRIEF] Daily brief generation failed", { error: msg });
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    briefs,
    todaysBrief: briefs[0] ?? null,
    isLoading,
    isGenerating,
    generateDailyBrief,
  };
}
