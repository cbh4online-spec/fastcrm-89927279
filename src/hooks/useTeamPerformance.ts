import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface AgentPerformanceRow {
  workspace_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_type: string | null;
  agent_status: string | null;
  max_open_conversations: number;
  max_open_tickets: number;
  open_conversations: number;
  urgent_open: number;
  conversations_resolved_7d: number;
  avg_first_response_seconds_7d: number | null;
  avg_resolution_seconds_7d: number | null;
  quality_score_avg: number | null;
  open_tickets: number;
  overdue_tickets: number;
  tickets_resolved_7d: number;
  pending_followups: number;
  overdue_followups: number;
  completed_followups_7d: number;
  products_shared_7d: number;
  workload_pct: number;
  workload_status: "available" | "balanced" | "overloaded" | "unknown";
}

export interface TeamInboxSummary {
  workspace_id: string;
  open_conversations: number;
  unassigned_conversations: number;
  urgent_conversations: number;
  stale_inbound: number;
  avg_first_response_seconds_today: number | null;
  resolved_today: number;
}

export interface AssignableAgent {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_type: string | null;
  agent_status: string | null;
  open_conversations: number;
  open_tickets: number;
  workload_pct: number;
  workload_status: string;
}

export function useAgentPerformance() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["agent-performance-realtime", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_performance_realtime")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("workload_pct", { ascending: false });
      if (error) throw error;
      return (data || []) as AgentPerformanceRow[];
    },
  });
}

export function useTeamInboxSummary() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["team-inbox-summary", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("team_inbox_summary")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TeamInboxSummary | null;
    },
  });
}

export function useAssignableAgents() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["assignable-agents", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_assignable_agents" as never, {
        p_workspace_id: currentWorkspace!.id,
      } as never);
      if (error) throw error;
      return (data || []) as unknown as AssignableAgent[];
    },
  });
}

export function useAssignConversation() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({
      conversationId,
      assigneeUserId,
    }: {
      conversationId: string;
      assigneeUserId: string;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.rpc("assign_conversation" as never, {
        p_conversation_id: conversationId,
        p_assignee_user_id: assigneeUserId,
        p_workspace_id: currentWorkspace.id,
      } as never);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-performance-realtime"] });
      qc.invalidateQueries({ queryKey: ["team-inbox-summary"] });
      qc.invalidateQueries({ queryKey: ["assignable-agents"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      toast.success("Conversa atribuída");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atribuir conversa"),
  });
}

export interface AgentProfile {
  id: string;
  workspace_id: string;
  user_id: string;
  display_name: string | null;
  role_type: "sales" | "support" | "manager" | "admin" | "hybrid";
  active: boolean;
  max_open_conversations: number;
  max_open_tickets: number;
  working_hours: any | null;
  skills: string[];
  languages: string[];
  channels: string[];
  auto_assignment_enabled: boolean;
  status: "available" | "busy" | "away" | "offline";
  created_at: string;
  updated_at: string;
}

export function useAgentProfiles() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["agent-profiles", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_profiles")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AgentProfile[];
    },
  });
}

export function useUpsertAgentProfile() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<AgentProfile> & { user_id: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await (supabase as any)
        .from("agent_profiles")
        .upsert(
          { workspace_id: currentWorkspace.id, ...input },
          { onConflict: "workspace_id,user_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-profiles"] });
      qc.invalidateQueries({ queryKey: ["agent-performance-realtime"] });
      toast.success("Perfil de agente guardado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao guardar perfil"),
  });
}

export interface AgentOpsSettings {
  id: string;
  workspace_id: string;
  is_enabled: boolean;
  auto_routing_enabled: boolean;
  auto_handoff_enabled: boolean;
  human_fallback_enabled: boolean;
  max_open_items_per_agent: number;
  auto_distribution_method: "manual" | "round_robin" | "least_loaded" | "skill_based" | "priority_based";
  unanswered_alert_minutes: number;
  include_tickets_in_workload: boolean;
  include_followups_in_workload: boolean;
  quality_score_enabled: boolean;
  coaching_ai_enabled: boolean;
  show_ranking: boolean;
  individual_metrics_managers_only: boolean;
}

export function useAgentOpsSettings() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["agent-ops-settings", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_ops_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as AgentOpsSettings | null;
    },
  });
}

export function useUpdateAgentOpsSettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (patch: Partial<AgentOpsSettings>) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data: existing } = await (supabase as any)
        .from("agent_ops_settings")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        const { data, error } = await (supabase as any)
          .from("agent_ops_settings")
          .update(patch)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from("agent_ops_settings")
        .insert({ workspace_id: currentWorkspace.id, ...patch })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-ops-settings"] });
      toast.success("Configurações guardadas");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao guardar configurações"),
  });
}

export interface ServiceQualityResult {
  quality_score: number;
  strengths: string[];
  improvements: string[];
  missed_opportunities: string[];
  suggested_next_step: string;
  coaching_note: string;
}

export function useAnalyzeServiceQuality() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "communication-analyze-service-quality",
        { body: { conversation_id: conversationId } }
      );
      if (error) throw error;
      return data as ServiceQualityResult & { fallback?: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-performance-realtime"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Análise de qualidade concluída");
    },
    onError: (e: any) => toast.error(e.message || "Erro na análise"),
  });
}
