import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface CompanyRevenueIntelligence {
  icp_score: number;
  estimated_arr: number;
  buying_signal: "strong" | "moderate" | "weak" | "none";
  expansion_probability: number;
  company_growth_stage: "startup" | "growth" | "scale_up" | "mature" | "enterprise" | "declining";
  reasoning: string;
}

export function useAnalyzeCompanyRevenue() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (companyId: string): Promise<CompanyRevenueIntelligence | null> => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke("ai-revenue-engine", {
        body: { companyId, workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Analysis failed");

      const result = data.results?.[companyId];
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smart-companies"] });
    },
    onError: (error) => {
      console.warn("[AI-REVENUE] Analysis failed:", error.message);
      if (error.message === "rate_limited") {
        toast.error("Limite de pedidos atingido. Tente novamente em breve.");
      } else if (error.message === "payment_required") {
        toast.error("Créditos insuficientes para análise AI.");
      } else {
        toast.error("Erro ao analisar empresa");
      }
    },
  });
}

export function useBulkAnalyzeRevenue() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (companyIds: string[]) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await supabase.functions.invoke("ai-revenue-engine", {
        body: { companyIds, workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Bulk analysis failed");

      const results = data.results || {};
      const successful = Object.values(results).filter((r: any) => r.success).length;
      const failed = Object.values(results).filter((r: any) => r.error).length;

      return { successful, failed, results };
    },
    onSuccess: ({ successful, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["smart-companies"] });
      if (failed > 0) {
        toast.warning(`${successful} analisadas, ${failed} falharam`);
      }
    },
    onError: (error) => {
      console.warn("[AI-REVENUE] Bulk analysis failed:", error.message);
      toast.error("Erro na análise em lote");
    },
  });
}
