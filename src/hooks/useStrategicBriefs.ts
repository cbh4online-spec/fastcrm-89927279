import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface WeeklyBrief {
  id: string;
  workspace_id: string;
  created_at: string;
  summary: string | null;
  opportunity: string | null;
  risk: string | null;
  market_signal: string | null;
  priority_actions: string[] | null;
  key_metrics: {
    leads_change?: number;
    revenue_change?: number;
    conversion_change?: number;
    response_time_change?: number;
    leads_total?: number;
    won_deals?: number;
    lost_deals?: number;
    messages_total?: number;
    tasks_completed?: number;
    tasks_pending?: number;
  } | null;
}

export function useStrategicBriefs() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const queryKey = ["weekly-briefs", currentWorkspace?.id];

  const { data: briefs = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("weekly_briefs")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as WeeklyBrief[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000,
  });

  const generateBrief = async () => {
    if (!currentWorkspace?.id) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("strategic-intelligence-brief", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else if (data.error.includes("Credits")) {
          toast.error("Créditos AI esgotados. Adicione créditos para continuar.");
        } else {
          toast.error(data.error);
        }
        return;
      }
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Brief executivo gerado com sucesso!");
      console.log("[STRATEGY-BRIEF] Weekly brief generated successfully", { workspace_id: currentWorkspace.id });
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: "STRATEGIC_BRIEF.GENERATED",
        entity_kind: "weekly_brief",
        entity_id: currentWorkspace.id,
        source_module: "strategy-brief",
        payload: { trigger: "manual" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar brief";
      console.error("[STRATEGY-BRIEF] Weekly brief generation failed", { error: msg });
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    briefs,
    latestBrief: briefs[0] ?? null,
    isLoading,
    isGenerating,
    generateBrief,
  };
}
