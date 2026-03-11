import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface GapAnalysis {
  metric: string;
  actual: number;
  target: number;
  gap_pct: number;
  status: "on_track" | "at_risk" | "behind";
  required_action: string;
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  action: string;
  impact: string;
}

export interface WeeklyStrategy {
  summary: string;
  gap_analysis: GapAnalysis[];
  risk_alerts: string[];
  recommendations: Recommendation[];
  quick_wins: string[];
}

export function useWeeklyStrategy() {
  const { currentWorkspace } = useWorkspace();
  const [strategy, setStrategy] = useState<WeeklyStrategy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasGenerated = useRef(false);

  const generate = useCallback(async () => {
    if (!currentWorkspace?.id || isLoading) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-weekly-strategy", {
        body: { workspace_id: currentWorkspace.id },
      });
      
      // Handle edge function errors gracefully
      if (error) {
        const msg = error.message || "";
        if (msg.includes("402") || msg.includes("Credits")) {
          toast.error("Créditos AI esgotados.");
        } else if (msg.includes("429") || msg.includes("Rate limit")) {
          toast.error("Limite de requisições excedido. Tente novamente em breve.");
        } else {
          console.error("Weekly strategy error:", error);
          toast.error("Erro ao gerar estratégia semanal");
        }
        return;
      }
      
      // Handle error in response body
      if (data?.error) {
        const errMsg = data.error;
        if (errMsg.includes("Credits")) {
          toast.error("Créditos AI esgotados.");
        } else if (errMsg.includes("Rate limit")) {
          toast.error("Limite de requisições excedido.");
        } else {
          toast.error(errMsg);
        }
        return;
      }
      
      if (data?.strategy) {
        setStrategy(data.strategy);
      }
    } catch (err: any) {
      console.error("Weekly strategy unexpected error:", err);
      toast.error("Erro ao gerar estratégia semanal");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, isLoading]);

  // Auto-generate on mount
  useEffect(() => {
    if (!currentWorkspace?.id || hasGenerated.current || strategy) return;
    hasGenerated.current = true;
    generate();
  }, [currentWorkspace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { strategy, isLoading, generate };
}
