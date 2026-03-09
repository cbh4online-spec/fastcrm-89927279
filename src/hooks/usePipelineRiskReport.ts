import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface PipelineRiskDeal {
  id: string;
  title: string;
  value: number;
  days_stalled?: number;
  days_inactive?: number;
  probability?: number;
}

export interface AIRiskAction {
  deal_title: string;
  action: string;
  urgency: "immediate" | "this_week" | "monitor";
}

export interface PipelineRiskReport {
  stalled_deals: PipelineRiskDeal[];
  low_prob_deals: PipelineRiskDeal[];
  inactive_deals: PipelineRiskDeal[];
  total_pipeline: number;
  at_risk_value: number;
  ai_assessment: {
    risk_level: "low" | "medium" | "high" | "critical";
    summary: string;
    critical_actions: AIRiskAction[];
    patterns: string[];
    recommendations: string[];
  } | null;
}

export function usePipelineRiskReport() {
  const { currentWorkspace } = useWorkspace();
  const [report, setReport] = useState<PipelineRiskReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = useCallback(async () => {
    if (!currentWorkspace?.id || isLoading) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-pipeline-risk", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setReport(data);
    } catch (err: any) {
      console.error("[CEO-COPILOT] Pipeline risk error:", err);
      if (err?.message?.includes("429")) {
        toast.error("Limite de requisições excedido. Tente novamente em breve.");
      } else {
        toast.error("Erro ao gerar análise de risco do pipeline");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, isLoading]);

  return { report, isLoading, generate };
}
