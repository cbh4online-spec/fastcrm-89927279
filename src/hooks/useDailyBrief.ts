import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";

const ACTION_KEY = "daily_brief";

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
  const { getCost, canAfford, consumeCredits } = useCreditWallet();

  const cost = getCost(ACTION_KEY);
  const affordable = canAfford(ACTION_KEY);

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
    if (!affordable) {
      triggerNoCreditsDialog({ actionLabel: "Daily Brief", creditsNeeded: cost });
      return;
    }
    setIsGenerating(true);
    try {
      // Consume credits first
      if (cost > 0) {
        await consumeCredits.mutateAsync({ actionKey: ACTION_KEY });
      }

      const { data, error } = await supabase.functions.invoke("daily-revenue-brief", {
        body: { workspace_id: currentWorkspace.id },
      });
      
      if (error) {
        const msg = error.message || "";
        if (msg.includes("402") || msg.includes("Credits")) {
          toast.error("Créditos AI esgotados.");
        } else if (msg.includes("429") || msg.includes("Rate limit")) {
          toast.error("Limite de pedidos AI atingido. Tente novamente mais tarde.");
        } else {
          console.error("[STRATEGY-BRIEF] Daily brief error:", error);
          toast.error("Erro ao gerar daily brief");
        }
        return;
      }
      
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
      // Don't double-toast if it was a credit error (already toasted by useCreditWallet)
      if (!msg.includes("créditos") && !msg.includes("credits")) {
        toast.error(msg);
      }
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
    briefCost: cost,
    canAffordBrief: affordable,
  };
}
