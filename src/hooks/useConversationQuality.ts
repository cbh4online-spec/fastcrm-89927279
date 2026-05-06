import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface QualityReview {
  id: string;
  workspace_id: string;
  conversation_id: string | null;
  ticket_id: string | null;
  contact_id: string | null;
  agent_id: string | null;
  reviewed_by: string | null;
  review_type: string;
  source: string;
  status: string;
  overall_score: number | null;
  clarity_score: number | null;
  empathy_score: number | null;
  commercial_score: number | null;
  resolution_score: number | null;
  followup_score: number | null;
  objection_handling_score: number | null;
  professionalism_score: number | null;
  speed_context_score: number | null;
  compliance_risk_score: number | null;
  strengths: Array<{ title: string; description: string }>;
  improvement_points: Array<{ title: string; description: string; suggestion: string }>;
  missed_opportunities: Array<{ type: string; description: string; recommended_action: string }>;
  objections_detected: Array<{ objection_type: string; customer_signal: string; was_handled: boolean; better_response: string }>;
  recommended_next_action: string | null;
  improved_reply_example: string | null;
  coaching_note: string | null;
  risk_flags: Array<{ risk_type: string; description: string; severity: "low" | "medium" | "high" }>;
  model_provider: string | null;
  model_name: string | null;
  confidence: number | null;
  analyzed_message_count: number | null;
  created_at: string;
  completed_at: string | null;
}

export function useConversationQualityReviews(params: {
  conversationId?: string | null;
  ticketId?: string | null;
  agentId?: string | null;
  limit?: number;
}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["quality-reviews", currentWorkspace?.id, params],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("conversation_quality_reviews" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(params.limit ?? 50);
      if (params.conversationId) q = q.eq("conversation_id", params.conversationId);
      if (params.ticketId) q = q.eq("ticket_id", params.ticketId);
      if (params.agentId) q = q.eq("agent_id", params.agentId);
      const { data, error } = await q;
      if (error) {
        console.warn("[quality-reviews]", error.message);
        return [];
      }
      return (data ?? []) as unknown as QualityReview[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useLatestQualityReview(params: { conversationId?: string | null; ticketId?: string | null }) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["quality-review-latest", currentWorkspace?.id, params],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      if (!params.conversationId && !params.ticketId) return null;
      let q = supabase
        .from("conversation_quality_reviews" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (params.conversationId) q = q.eq("conversation_id", params.conversationId);
      if (params.ticketId) q = q.eq("ticket_id", params.ticketId);
      const { data, error } = await q.maybeSingle();
      if (error) {
        console.warn("[quality-review-latest]", error.message);
        return null;
      }
      return (data as unknown) as QualityReview | null;
    },
    enabled: !!currentWorkspace?.id && !!(params.conversationId || params.ticketId),
  });
}

export function useAnalyzeConversationQuality() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (vars: {
      conversationId?: string;
      ticketId?: string;
      agentId?: string | null;
      reviewType?: "conversation" | "ticket" | "agent_reply";
    }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      const { data, error } = await supabase.functions.invoke("conversation-quality-review", {
        body: {
          workspace_id: currentWorkspace.id,
          conversation_id: vars.conversationId ?? null,
          ticket_id: vars.ticketId ?? null,
          agent_id: vars.agentId ?? null,
          review_type: vars.reviewType ?? (vars.ticketId ? "ticket" : "conversation"),
        },
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.code === "rate_limit") throw new Error("Limite AI atingido. Tente novamente em instantes.");
        if (data?.code === "no_credits") throw new Error("Créditos AI esgotados.");
        throw new Error(data?.error ?? "Falha na análise");
      }
      return data.review as QualityReview;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quality-reviews"] });
      qc.invalidateQueries({ queryKey: ["quality-review-latest"] });
      toast.success("Análise de qualidade concluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ===== Coaching insights =====
export interface CoachingInsight {
  id: string;
  workspace_id: string;
  agent_id: string;
  period_start: string;
  period_end: string;
  conversations_analyzed: number;
  avg_quality_score: number | null;
  avg_clarity_score: number | null;
  avg_empathy_score: number | null;
  avg_commercial_score: number | null;
  avg_resolution_score: number | null;
  avg_followup_score: number | null;
  recurring_strengths: Array<{ title: string; description: string }>;
  recurring_improvement_areas: Array<{ title: string; description: string }>;
  coaching_recommendations: Array<{ title: string; action: string }>;
  suggested_training_topics: string[];
  example_good_replies: Array<{ text: string }>;
  example_improved_replies: Array<{ text: string }>;
  generated_at: string;
}

export function useAgentCoachingInsights(agentId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["coaching-insights", currentWorkspace?.id, agentId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("agent_coaching_insights" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("period_end", { ascending: false })
        .limit(50);
      if (agentId) q = q.eq("agent_id", agentId);
      const { data, error } = await q;
      if (error) {
        console.warn("[coaching-insights]", error.message);
        return [];
      }
      return (data ?? []) as unknown as CoachingInsight[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useGenerateCoachingInsights() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (vars: { agentId: string; periodDays?: number }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      const { data, error } = await supabase.functions.invoke("agent-coaching-insights-generate", {
        body: {
          workspace_id: currentWorkspace.id,
          agent_id: vars.agentId,
          period_days: vars.periodDays ?? 30,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Falha ao gerar insights");
      return data.insight as CoachingInsight;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-insights"] });
      toast.success("Insights de coaching gerados");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ===== Objection library =====
export interface ObjectionLibraryItem {
  id: string;
  workspace_id: string | null;
  objection_type: string;
  title: string;
  description: string | null;
  real_example: string | null;
  suggested_response: string | null;
  improved_response: string | null;
  source_conversation_id: string | null;
  frequency_count: number;
  tags: string[];
  active: boolean;
  is_template: boolean;
  created_at: string;
}

export function useObjectionLibrary() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["objection-library", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objection_library" as any)
        .select("*")
        .or(`workspace_id.eq.${currentWorkspace?.id},is_template.eq.true`)
        .eq("active", true)
        .order("is_template", { ascending: false })
        .order("frequency_count", { ascending: false })
        .limit(200);
      if (error) {
        console.warn("[objection-library]", error.message);
        return [];
      }
      return (data ?? []) as unknown as ObjectionLibraryItem[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useAddObjection() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: Partial<ObjectionLibraryItem> & { objection_type: string; title: string }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      const { data, error } = await supabase
        .from("objection_library" as any)
        .insert({
          workspace_id: currentWorkspace.id,
          objection_type: input.objection_type,
          title: input.title,
          description: input.description ?? null,
          real_example: input.real_example ?? null,
          suggested_response: input.suggested_response ?? null,
          improved_response: input.improved_response ?? null,
          source_conversation_id: input.source_conversation_id ?? null,
          tags: input.tags ?? [],
          is_template: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as ObjectionLibraryItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objection-library"] });
      toast.success("Objeção guardada na biblioteca");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ===== Playbooks =====
export interface Playbook {
  id: string;
  workspace_id: string | null;
  name: string;
  category: string;
  description: string | null;
  example_opening: string | null;
  example_questions: string[];
  example_responses: string[];
  closing_cta: string | null;
  do_list: string[];
  dont_list: string[];
  active: boolean;
  is_template: boolean;
  created_at: string;
}

export function usePlaybooks() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["playbooks", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_playbooks" as any)
        .select("*")
        .or(`workspace_id.eq.${currentWorkspace?.id},is_template.eq.true`)
        .eq("active", true)
        .order("is_template", { ascending: false })
        .order("name");
      if (error) {
        console.warn("[playbooks]", error.message);
        return [];
      }
      return (data ?? []) as unknown as Playbook[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

// ===== Coaching tasks =====
export interface CoachingTask {
  id: string;
  workspace_id: string;
  agent_id: string;
  source_review_id: string | null;
  title: string;
  description: string | null;
  training_topic: string | null;
  due_at: string | null;
  status: string;
  priority: string;
  created_at: string;
  completed_at: string | null;
}

export function useCoachingTasks(agentId?: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["coaching-tasks", currentWorkspace?.id, agentId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let q = supabase
        .from("coaching_tasks" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (agentId) q = q.eq("agent_id", agentId);
      const { data, error } = await q;
      if (error) return [];
      return (data ?? []) as unknown as CoachingTask[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateCoachingTask() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      agentId: string;
      title: string;
      description?: string;
      trainingTopic?: string;
      priority?: string;
      dueAt?: string;
      sourceReviewId?: string;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      const { data, error } = await supabase
        .from("coaching_tasks" as any)
        .insert({
          workspace_id: currentWorkspace.id,
          agent_id: input.agentId,
          title: input.title,
          description: input.description ?? null,
          training_topic: input.trainingTopic ?? null,
          priority: input.priority ?? "medium",
          due_at: input.dueAt ?? null,
          source_review_id: input.sourceReviewId ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as CoachingTask;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-tasks"] });
      toast.success("Tarefa de coaching criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCoachingTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const { error } = await supabase
        .from("coaching_tasks" as any)
        .update({
          status: vars.status,
          completed_at: vars.status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-tasks"] });
      toast.success("Tarefa atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
