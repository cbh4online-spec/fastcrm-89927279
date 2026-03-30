import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useEffect } from "react";

// Types
export interface BusinessObjective {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  objective_type: string;
  status: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  period_start: string | null;
  period_end: string | null;
  owner_user_id: string | null;
  priority: string;
  auto_plan_enabled: boolean;
  auto_execute_enabled: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ObjectiveMetric {
  id: string;
  metric_key: string;
  metric_label: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  progress_percent: number | null;
}

export interface ObjectivePlan {
  id: string;
  title: string | null;
  plan_json: any;
  status: string;
  generated_by: string | null;
  created_at: string;
}

export interface ObjectiveActionLink {
  id: string;
  action_execution_id: string | null;
  task_id: string | null;
  attributed_value: number | null;
  created_at: string;
}

export interface ObjectiveSettings {
  is_enabled: boolean;
  max_daily_actions_per_objective: number;
  auto_plan_enabled: boolean;
  auto_replan_enabled: boolean;
  auto_execute_enabled: boolean;
  alert_when_at_risk: boolean;
}

const OBJECTIVE_TYPES = [
  { value: "recover_revenue", label: "Recuperar Receita" },
  { value: "generate_meetings", label: "Gerar Reuniões" },
  { value: "increase_pipeline_value", label: "Aumentar Pipeline" },
  { value: "improve_conversion_rate", label: "Melhorar Conversão" },
  { value: "reduce_renewal_risk", label: "Reduzir Risco de Renovação" },
  { value: "recover_abandoned_carts", label: "Recuperar Carrinhos" },
  { value: "increase_store_revenue", label: "Aumentar Receita Loja" },
  { value: "reactivate_silent_leads", label: "Reativar Leads Silenciosos" },
] as const;

export { OBJECTIVE_TYPES };

// --- Hooks ---

export function useBusinessObjectives(statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["business-objectives", wid, statusFilter],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from("business_objectives")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BusinessObjective[];
    },
    enabled: !!wid,
  });

  // Realtime
  useEffect(() => {
    if (!wid) return;
    const ch = supabase
      .channel(`objectives-rt-${wid}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "business_objectives",
        filter: `workspace_id=eq.${wid}`,
      }, () => qc.invalidateQueries({ queryKey: ["business-objectives", wid] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [wid, qc]);

  return query;
}

export function useObjectiveDetail(objectiveId: string | null) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const objective = useQuery({
    queryKey: ["objective-detail", wid, objectiveId],
    queryFn: async () => {
      if (!wid || !objectiveId) return null;
      const { data, error } = await supabase
        .from("business_objectives")
        .select("*")
        .eq("id", objectiveId)
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data as BusinessObjective | null;
    },
    enabled: !!wid && !!objectiveId,
  });

  const metrics = useQuery({
    queryKey: ["objective-metrics", wid, objectiveId],
    queryFn: async () => {
      if (!wid || !objectiveId) return [];
      const { data, error } = await supabase
        .from("objective_metrics")
        .select("*")
        .eq("objective_id", objectiveId)
        .eq("workspace_id", wid);
      if (error) throw error;
      return (data || []) as ObjectiveMetric[];
    },
    enabled: !!wid && !!objectiveId,
  });

  const plans = useQuery({
    queryKey: ["objective-plans", wid, objectiveId],
    queryFn: async () => {
      if (!wid || !objectiveId) return [];
      const { data, error } = await supabase
        .from("objective_plans")
        .select("*")
        .eq("objective_id", objectiveId)
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as ObjectivePlan[];
    },
    enabled: !!wid && !!objectiveId,
  });

  const actionLinks = useQuery({
    queryKey: ["objective-action-links", wid, objectiveId],
    queryFn: async () => {
      if (!wid || !objectiveId) return [];
      const { data, error } = await supabase
        .from("objective_action_links")
        .select("*")
        .eq("objective_id", objectiveId)
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ObjectiveActionLink[];
    },
    enabled: !!wid && !!objectiveId,
  });

  return {
    objective: objective.data,
    metrics: metrics.data || [],
    plans: plans.data || [],
    actionLinks: actionLinks.data || [],
    isLoading: objective.isLoading || metrics.isLoading,
  };
}

export function useCreateObjective() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      objective_type: string;
      target_value: number;
      unit?: string;
      period_start?: string;
      period_end?: string;
      owner_user_id?: string;
      priority?: string;
    }) => {
      if (!wid) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("business_objectives")
        .insert({
          workspace_id: wid,
          title: input.title,
          description: input.description || null,
          objective_type: input.objective_type,
          target_value: input.target_value,
          unit: input.unit || "€",
          period_start: input.period_start || null,
          period_end: input.period_end || null,
          owner_user_id: input.owner_user_id || null,
          priority: input.priority || "medium",
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Emit kernel event
      try {
        await supabase.from("kernel_events").insert({
          workspace_id: wid,
          type: "OBJECTIVE.CREATED",
          entity_kind: "business_objective",
          entity_id: data.id,
          actor_type: "user",
          source_module: "objective-center",
          payload: { objective_type: input.objective_type, target_value: input.target_value },
          status: "pending",
          schema_version: 1,
        });
      } catch {}

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-objectives", wid] });
      toast.success("Objetivo criado");
    },
    onError: (e) => toast.error("Erro ao criar objetivo: " + e.message),
  });
}

export function useUpdateObjective() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<BusinessObjective>) => {
      if (!wid) throw new Error("No workspace");
      const { error } = await supabase
        .from("business_objectives")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("workspace_id", wid);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["business-objectives", wid] });
      qc.invalidateQueries({ queryKey: ["objective-detail", wid, vars.id] });
      toast.success("Objetivo atualizado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useGeneratePlan() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      if (!wid) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("generate-objective-plan", {
        body: { workspace_id: wid, objective_id: objectiveId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, objectiveId) => {
      qc.invalidateQueries({ queryKey: ["objective-plans", wid, objectiveId] });
      toast.success("Plano gerado com sucesso");
    },
    onError: (e) => toast.error("Erro ao gerar plano: " + e.message),
  });
}

export function useExecutePlan() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      if (!wid) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("process-objective-plan", {
        body: { workspace_id: wid, objective_id: objectiveId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, objectiveId) => {
      qc.invalidateQueries({ queryKey: ["objective-action-links", wid, objectiveId] });
      qc.invalidateQueries({ queryKey: ["business-objectives", wid] });
      toast.success(`Plano executado: ${data?.actions_created || 0} ações criadas`);
    },
    onError: (e) => toast.error("Erro ao executar plano: " + e.message),
  });
}

export function useRecalculateProgress() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId?: string) => {
      if (!wid) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("recalculate-objective-progress", {
        body: { workspace_id: wid, objective_id: objectiveId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-objectives", wid] });
      toast.success("Progresso recalculado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useObjectiveSettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["objective-settings", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("objective_settings")
        .select("*")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data as ObjectiveSettings | null;
    },
    enabled: !!wid,
  });

  const upsert = useMutation({
    mutationFn: async (settings: Partial<ObjectiveSettings>) => {
      if (!wid) throw new Error("No workspace");
      const { error } = await supabase
        .from("objective_settings")
        .upsert({
          workspace_id: wid,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["objective-settings", wid] });
      toast.success("Definições guardadas");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  return { settings: query.data, isLoading: query.isLoading, upsertSettings: upsert };
}

export function useObjectiveStats() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["objective-stats", wid],
    queryFn: async () => {
      if (!wid) return { active: 0, atRisk: 0, completed: 0, totalTarget: 0, totalCurrent: 0 };

      const { data } = await supabase
        .from("business_objectives")
        .select("status, target_value, current_value")
        .eq("workspace_id", wid)
        .in("status", ["active", "at_risk", "on_track", "completed"]);

      const rows = data || [];
      return {
        active: rows.filter(r => ["active", "on_track"].includes(r.status)).length,
        atRisk: rows.filter(r => r.status === "at_risk").length,
        completed: rows.filter(r => r.status === "completed").length,
        totalTarget: rows.reduce((s, r) => s + (Number(r.target_value) || 0), 0),
        totalCurrent: rows.reduce((s, r) => s + (Number(r.current_value) || 0), 0),
      };
    },
    enabled: !!wid,
  });
}
