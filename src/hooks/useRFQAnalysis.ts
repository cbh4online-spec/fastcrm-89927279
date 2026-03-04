import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnalysisWeights {
  price: number;
  lead_time: number;
  moq: number;
  preference: number;
  quality: number;
}

export type AwardStrategy = "best_per_item" | "single_supplier" | "weighted_best_value" | "fastest_delivery" | "lowest_total_cost";

export function useRFQAnalysis(rfqId: string | undefined) {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeRFQ = useCallback(async (weights?: Partial<AnalysisWeights>) => {
    if (!rfqId) return null;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("rfq-analyze", {
        body: { rfq_id: rfqId, weights },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } finally {
      setIsAnalyzing(false);
    }
  }, [rfqId]);

  const recommendMutation = useMutation({
    mutationFn: async ({ strategy, weights_json }: { strategy: AwardStrategy; weights_json: AnalysisWeights }) => {
      const { data, error } = await supabase.functions.invoke("rfq-recommend-award", {
        body: { rfq_id: rfqId, strategy, weights_json },
      });
      if (error) {
        const msg = error?.context ? await error.context.json().then((j: any) => j.error).catch(() => error.message) : error.message;
        throw new Error(msg || "Erro ao gerar recomendação");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rfq-awards", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["rfq-detail"] });
      toast.success(data.summary || "Recomendação gerada!");
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (awardId: string) => {
      const { data, error } = await supabase.functions.invoke("rfq-award-confirm", {
        body: { award_id: awardId },
      });
      if (error) {
        const msg = error?.context ? await error.context.json().then((j: any) => j.error).catch(() => error.message) : error.message;
        throw new Error(msg || "Erro ao confirmar");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-awards", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["rfq-detail"] });
      toast.success("Adjudicação confirmada!");
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (awardId: string) => {
      const { data, error } = await supabase.functions.invoke("rfq-award-convert-to-pos", {
        body: { award_id: awardId },
      });
      if (error) {
        const msg = error?.context ? await error.context.json().then((j: any) => j.error).catch(() => error.message) : error.message;
        throw new Error(msg || "Erro ao gerar POs");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rfq-awards", rfqId] });
      queryClient.invalidateQueries({ queryKey: ["rfq-detail"] });
      queryClient.invalidateQueries({ queryKey: ["rfq-generated-pos"] });
      toast.success(`${data.count} Ordem(ns) de Compra criada(s)!`);
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  // Fetch existing awards for this RFQ
  const { data: awards = [] } = useQuery({
    queryKey: ["rfq-awards", rfqId],
    queryFn: async () => {
      if (!rfqId) return [];
      const { data, error } = await supabase
        .from("rfq_awards" as any)
        .select("*, rfq_award_items:rfq_award_items(*)")
        .eq("rfq_id", rfqId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!rfqId,
  });

  return {
    analyzeRFQ,
    isAnalyzing,
    recommendAward: recommendMutation.mutateAsync,
    isRecommending: recommendMutation.isPending,
    confirmAward: confirmMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    convertToPOs: convertMutation.mutateAsync,
    isConverting: convertMutation.isPending,
    awards,
  };
}
