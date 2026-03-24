import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type SystemStatus = "operational" | "degraded" | "down" | "unknown";

export interface SystemState {
  status: SystemStatus;
  label: string;
  metrics: Record<string, string | number>;
  lastActivity: string | null;
  alerts: string[];
}

export interface AIOperationsData {
  agents: SystemState;
  imo: SystemState;
  voice: SystemState;
  claude: SystemState;
  trigger: SystemState;
  isLoading: boolean;
  refetchAll: () => void;
}

function deriveStatus(errorRate: number, hasRecent: boolean): SystemStatus {
  if (!hasRecent) return "unknown";
  if (errorRate > 0.5) return "down";
  if (errorRate > 0.15) return "degraded";
  return "operational";
}

export function useAIOperationsCenter(): AIOperationsData {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const since24h = new Date(Date.now() - 86400000).toISOString();

  // AI Agents — runs from trigger_job_runs
  const agents = useQuery({
    queryKey: ["ops-agents", wid],
    queryFn: async () => {
      const { data: runs } = await (supabase
        .from("trigger_job_runs")
        .select("id, status, completed_at, created_at") as any)
        .eq("workspace_id", wid!)
        .gte("created_at", since24h);
      const all = (runs || []) as any[];
      const completed = all.filter((r: any) => r.status === "completed").length;
      const failed = all.filter((r: any) => r.status === "failed").length;
      const running = all.filter((r: any) => r.status === "running").length;
      const last = all[0]?.created_at ?? null;
      return { total: all.length, completed, failed, running, last };
    },
    enabled: !!wid,
    staleTime: 30_000,
  });

  // IMO AI — latest insight
  const imo = useQuery({
    queryKey: ["ops-imo", wid],
    queryFn: async () => {
      const { data } = await (supabase
        .from("imo_growth_insights")
        .select("growth_score, generated_at, is_stale") as any)
        .eq("workspace_id", wid!)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { growth_score: number; generated_at: string; is_stale: boolean } | null;
    },
    enabled: !!wid,
    staleTime: 60_000,
  });

  // ElevenLabs / Voice
  const voice = useQuery({
    queryKey: ["ops-voice", wid],
    queryFn: async () => {
      const { data: settings } = await (supabase
        .from("voice_settings")
        .select("tts_enabled") as any)
        .eq("workspace_id", wid!)
        .maybeSingle();
      const { count } = await (supabase
        .from("voice_audio_cache")
        .select("id", { count: "exact", head: true }) as any)
        .eq("workspace_id", wid!);
      return { enabled: settings?.tts_enabled ?? false, cacheCount: count ?? 0 };
    },
    enabled: !!wid,
    staleTime: 60_000,
  });

  // Claude / Anthropic — usage logs
  const claude = useQuery({
    queryKey: ["ops-claude", wid],
    queryFn: async () => {
      const { data: settings } = await (supabase
        .from("ai_settings")
        .select("default_model, current_month_tokens, current_month_cost_usd, monthly_token_budget") as any)
        .eq("workspace_id", wid!)
        .maybeSingle();
      const { data: logs } = await (supabase
        .from("ai_usage_logs")
        .select("tokens_total, cost_usd, was_error") as any)
        .eq("workspace_id", wid!)
        .gte("created_at", since24h);
      const all = (logs || []) as any[];
      const errors24h = all.filter((l: any) => l.was_error).length;
      const tokens24h = all.reduce((s: number, l: any) => s + (l.tokens_total || 0), 0);
      return {
        model: settings?.default_model ?? "—",
        monthTokens: settings?.current_month_tokens ?? 0,
        monthCost: settings?.current_month_cost_usd ?? 0,
        budget: settings?.monthly_token_budget ?? 0,
        tokens24h,
        errors24h,
        calls24h: all.length,
      };
    },
    enabled: !!wid,
    staleTime: 30_000,
  });

  // Trigger.dev — job runs
  const trigger = useQuery({
    queryKey: ["ops-trigger", wid],
    queryFn: async () => {
      const { data: runs } = await (supabase
        .from("trigger_job_runs")
        .select("id, status, job_type, completed_at, created_at") as any)
        .eq("workspace_id", wid!)
        .gte("created_at", since24h)
        .order("created_at", { ascending: false });
      const all = (runs || []) as any[];
      const completed = all.filter((r: any) => r.status === "completed").length;
      const failed = all.filter((r: any) => r.status === "failed").length;
      const running = all.filter((r: any) => r.status === "running").length;
      const types = new Set(all.map((r: any) => r.job_type));
      return { total: all.length, completed, failed, running, jobTypes: types.size, last: all[0]?.created_at ?? null };
    },
    enabled: !!wid,
    staleTime: 30_000,
  });

  const agentData = agents.data;
  const agentErr = agentData ? agentData.failed / Math.max(agentData.total, 1) : 0;

  const claudeData = claude.data;
  const claudeErr = claudeData ? claudeData.errors24h / Math.max(claudeData.calls24h, 1) : 0;

  const triggerData = trigger.data;
  const triggerErr = triggerData ? triggerData.failed / Math.max(triggerData.total, 1) : 0;

  const budgetPct = claudeData && claudeData.budget > 0
    ? Math.round((claudeData.monthTokens / claudeData.budget) * 100)
    : null;

  const refetchAll = () => {
    agents.refetch();
    imo.refetch();
    voice.refetch();
    claude.refetch();
    trigger.refetch();
  };

  return {
    agents: {
      status: deriveStatus(agentErr, (agentData?.total ?? 0) > 0),
      label: "AI Agents",
      metrics: {
        "Runs 24h": agentData?.total ?? 0,
        "Completed": agentData?.completed ?? 0,
        "Failed": agentData?.failed ?? 0,
        "Running": agentData?.running ?? 0,
      },
      lastActivity: agentData?.last ?? null,
      alerts: agentData && agentData.failed > 3 ? [`${agentData.failed} falhas nas últimas 24h`] : [],
    },
    imo: {
      status: imo.data ? (imo.data.is_stale ? "degraded" : "operational") : "unknown",
      label: "IMO AI",
      metrics: {
        "Growth Score": imo.data?.growth_score ?? "—",
        "Última Análise": imo.data?.generated_at ? new Date(imo.data.generated_at).toLocaleDateString("pt") : "—",
        "Stale": imo.data?.is_stale ? "Sim" : "Não",
      },
      lastActivity: imo.data?.generated_at ?? null,
      alerts: imo.data?.is_stale ? ["Análise desactualizada — considere regenerar"] : [],
    },
    voice: {
      status: voice.data?.enabled ? "operational" : "down",
      label: "ElevenLabs Voice",
      metrics: {
        "Estado": voice.data?.enabled ? "Activo" : "Desactivado",
        "Áudios em Cache": voice.data?.cacheCount ?? 0,
      },
      lastActivity: null,
      alerts: !voice.data?.enabled ? ["TTS desactivado"] : [],
    },
    claude: {
      status: deriveStatus(claudeErr, (claudeData?.calls24h ?? 0) > 0),
      label: "Claude / Anthropic",
      metrics: {
        "Modelo": claudeData?.model ?? "—",
        "Tokens 24h": claudeData?.tokens24h ?? 0,
        "Custo Mensal": `$${(claudeData?.monthCost ?? 0).toFixed(2)}`,
        "Budget": budgetPct !== null ? `${budgetPct}%` : "—",
        "Chamadas 24h": claudeData?.calls24h ?? 0,
      },
      lastActivity: null,
      alerts: budgetPct !== null && budgetPct >= 80 ? [`Budget a ${budgetPct}%`] : [],
    },
    trigger: {
      status: deriveStatus(triggerErr, (triggerData?.total ?? 0) > 0),
      label: "Trigger.dev Jobs",
      metrics: {
        "Jobs 24h": triggerData?.total ?? 0,
        "Completed": triggerData?.completed ?? 0,
        "Failed": triggerData?.failed ?? 0,
        "Running": triggerData?.running ?? 0,
        "Tipos": triggerData?.jobTypes ?? 0,
      },
      lastActivity: triggerData?.last ?? null,
      alerts: triggerData && triggerData.failed > 2 ? [`${triggerData.failed} jobs falhados`] : [],
    },
    isLoading: agents.isLoading || imo.isLoading || voice.isLoading || claude.isLoading || trigger.isLoading,
    refetchAll,
  };
}
