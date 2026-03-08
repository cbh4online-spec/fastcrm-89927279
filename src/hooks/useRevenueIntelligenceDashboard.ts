import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDealScores } from "@/hooks/useDealScores";
import { useRevenueForecast } from "@/hooks/useRevenueForecast";

export interface TopGrowthAccount {
  id: string;
  name: string;
  icp_score: number | null;
  estimated_arr: number | null;
  buying_signal: string | null;
  expansion_probability: number | null;
  company_growth_stage: string | null;
  pipeline_value: number;
  deal_count: number;
}

export interface PipelineRiskBucket {
  category: "hot" | "likely" | "uncertain" | "low";
  count: number;
  total_value: number;
  avg_score: number;
}

export interface StageConversion {
  stage: string;
  count: number;
  value: number;
  avg_days: number;
}

export function useTopGrowthAccounts(limit = 10) {
  const { currentWorkspace } = useWorkspace();

  return useQuery<TopGrowthAccount[]>({
    queryKey: ["top-growth-accounts", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      // Get companies with AI data - cast to any since AI columns may not be in generated types yet
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, icp_score, estimated_arr, buying_signal, expansion_probability, company_growth_stage" as any)
        .eq("workspace_id", currentWorkspace.id)
        .not("icp_score" as any, "is", null)
        .order("icp_score" as any, { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get pipeline values per company
      const { data: opps } = await supabase
        .from("opportunities")
        .select("id, value, company_id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "open");

      const pipelineMap = new Map<string, { value: number; count: number }>();
      (opps || []).forEach((o) => {
        if (!o.company_id) return;
        const existing = pipelineMap.get(o.company_id) || { value: 0, count: 0 };
        existing.value += o.value || 0;
        existing.count += 1;
        pipelineMap.set(o.company_id, existing);
      });

      return ((companies as any[]) || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        icp_score: c.icp_score,
        estimated_arr: c.estimated_arr,
        buying_signal: c.buying_signal,
        expansion_probability: c.expansion_probability,
        company_growth_stage: c.company_growth_stage,
        pipeline_value: pipelineMap.get(c.id)?.value || 0,
        deal_count: pipelineMap.get(c.id)?.count || 0,
      }));
    },
    enabled: !!currentWorkspace,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePipelineRiskAnalysis() {
  const { scores, isLoading: scoresLoading } = useDealScores();
  const { currentWorkspace } = useWorkspace();

  const { data: opps, isLoading: oppsLoading } = useQuery({
    queryKey: ["pipeline-opps-risk", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, value, stage_id")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "open");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace,
    staleTime: 3 * 60 * 1000,
  });

  const buckets: PipelineRiskBucket[] = [];
  if (scores.length > 0 && opps) {
    const scoreMap = new Map(scores.map((s) => [s.opportunity_id, s]));
    const groups: Record<string, { count: number; total_value: number; total_score: number }> = {
      hot: { count: 0, total_value: 0, total_score: 0 },
      likely: { count: 0, total_value: 0, total_score: 0 },
      uncertain: { count: 0, total_value: 0, total_score: 0 },
      low: { count: 0, total_value: 0, total_score: 0 },
    };

    opps.forEach((opp) => {
      const score = scoreMap.get(opp.id);
      const cat = score?.category || "uncertain";
      groups[cat].count += 1;
      groups[cat].total_value += opp.value || 0;
      groups[cat].total_score += score?.close_score || 0;
    });

    (["hot", "likely", "uncertain", "low"] as const).forEach((cat) => {
      const g = groups[cat];
      buckets.push({
        category: cat,
        count: g.count,
        total_value: g.total_value,
        avg_score: g.count > 0 ? Math.round(g.total_score / g.count) : 0,
      });
    });
  }

  return { buckets, isLoading: scoresLoading || oppsLoading };
}

export function useStageConversion() {
  const { currentWorkspace } = useWorkspace();

  return useQuery<StageConversion[]>({
    queryKey: ["stage-conversion", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id, name, position")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: true });

      const { data: opps } = await supabase
        .from("opportunities")
        .select("id, value, stage_id, created_at, updated_at")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "open");

      if (!stages || !opps) return [];

      const stageMap = new Map(stages.map((s) => [s.id, s.name]));
      const grouped = new Map<string, { count: number; value: number; totalDays: number }>();

      opps.forEach((opp) => {
        const stageName = stageMap.get(opp.stage_id) || "Desconhecido";
        const existing = grouped.get(stageName) || { count: 0, value: 0, totalDays: 0 };
        existing.count += 1;
        existing.value += opp.value || 0;
        const days = Math.floor((Date.now() - new Date(opp.created_at).getTime()) / 86400000);
        existing.totalDays += days;
        grouped.set(stageName, existing);
      });

      return Array.from(grouped.entries()).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
        avg_days: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
      }));
    },
    enabled: !!currentWorkspace,
    staleTime: 5 * 60 * 1000,
  });
}
