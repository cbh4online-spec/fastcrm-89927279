import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────
export interface AgentTeam {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  objective_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkItem {
  id: string;
  workspace_id: string;
  bot_id: string | null;
  entity_type: string;
  entity_id: string | null;
  work_type: string;
  payload_json: Record<string, unknown>;
  priority: number;
  status: string;
  routed_by: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentHandoff {
  id: string;
  workspace_id: string;
  from_bot_id: string | null;
  to_bot_id: string | null;
  to_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  trigger_type: string | null;
  trigger_reason: string | null;
  context_snapshot: Record<string, unknown>;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface AgentOpsSettings {
  id: string;
  workspace_id: string;
  is_enabled: boolean;
  auto_routing_enabled: boolean;
  auto_handoff_enabled: boolean;
  human_fallback_enabled: boolean;
  supervisor_enabled: boolean;
  max_open_items_per_agent: number;
}

// ─── Teams ───────────────────────────────────────────────────────
export function useAgentTeams() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["agent-teams", wsId],
    queryFn: async (): Promise<AgentTeam[]> => {
      if (!wsId) return [];
      const { data, error } = await (supabase as any)
        .from("agent_teams")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!wsId,
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; description?: string; objective_type?: string }) => {
      if (!wsId) throw new Error("No workspace");
      const { data, error } = await (supabase as any)
        .from("agent_teams")
        .insert({ workspace_id: wsId, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-teams", wsId] });
      toast.success("Equipa criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; objective_type?: string; is_active?: boolean }) => {
      const { error } = await (supabase as any)
        .from("agent_teams")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-teams", wsId] });
      toast.success("Equipa atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("agent_teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-teams", wsId] });
      toast.success("Equipa eliminada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { teams: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}

// ─── Work Items ──────────────────────────────────────────────────
export function useAgentWorkItems(filters?: { status?: string; work_type?: string; bot_id?: string }) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["agent-work-items", wsId, filters],
    queryFn: async (): Promise<AgentWorkItem[]> => {
      if (!wsId) return [];
      let q = (supabase as any)
        .from("agent_work_items")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.work_type) q = q.eq("work_type", filters.work_type);
      if (filters?.bot_id) q = q.eq("bot_id", filters.bot_id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!wsId,
  });
}

// ─── Handoffs ────────────────────────────────────────────────────
export function useAgentHandoffs(filters?: { status?: string }) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["agent-handoffs", wsId, filters],
    queryFn: async (): Promise<AgentHandoff[]> => {
      if (!wsId) return [];
      let q = (supabase as any)
        .from("agent_handoffs")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!wsId,
  });
}

// ─── Settings ────────────────────────────────────────────────────
export function useAgentOpsSettings() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["agent-ops-settings", wsId],
    queryFn: async (): Promise<AgentOpsSettings | null> => {
      if (!wsId) return null;
      const { data, error } = await (supabase as any)
        .from("agent_ops_settings")
        .select("*")
        .eq("workspace_id", wsId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!wsId,
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<Omit<AgentOpsSettings, "id" | "workspace_id">>) => {
      if (!wsId) throw new Error("No workspace");
      const { error } = await (supabase as any)
        .from("agent_ops_settings")
        .upsert({ workspace_id: wsId, ...input }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-ops-settings", wsId] });
      toast.success("Configurações guardadas!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { settings: query.data, isLoading: query.isLoading, upsert };
}

// ─── Stats ───────────────────────────────────────────────────────
export function useAgentOpsStats() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["agent-ops-stats", wsId],
    queryFn: async () => {
      if (!wsId) return { pending: 0, inProgress: 0, completed: 0, failed: 0, handoffsToday: 0, escalated: 0 };

      const { count: pending } = await (supabase as any)
        .from("agent_work_items")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .in("status", ["pending", "assigned"]);

      const { count: inProgress } = await (supabase as any)
        .from("agent_work_items")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("status", "in_progress");

      const { count: completed } = await (supabase as any)
        .from("agent_work_items")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("status", "completed");

      const { count: failed } = await (supabase as any)
        .from("agent_work_items")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("status", "failed");

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: handoffsToday } = await (supabase as any)
        .from("agent_handoffs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .gte("created_at", todayStart.toISOString());

      const { count: escalated } = await (supabase as any)
        .from("agent_handoffs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("status", "escalated_to_human");

      return {
        pending: pending || 0,
        inProgress: inProgress || 0,
        completed: completed || 0,
        failed: failed || 0,
        handoffsToday: handoffsToday || 0,
        escalated: escalated || 0,
      };
    },
    enabled: !!wsId,
    refetchInterval: 30_000,
  });
}

// ─── Performance Stats ──────────────────────────────────────────
export interface AgentPerfStat {
  botId: string;
  total: number;
  completed: number;
  failed: number;
  open: number;
  avgCompletionMs: number;
}

export function useAgentPerformanceStats() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["agent-perf-stats", wsId],
    queryFn: async (): Promise<AgentPerfStat[]> => {
      if (!wsId) return [];

      // Get active bots
      const { data: bots } = await (supabase as any)
        .from("bots")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("status", "active");

      if (!bots || bots.length === 0) return [];

      const botIds = bots.map((b: any) => b.id);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: items } = await (supabase as any)
        .from("agent_work_items")
        .select("bot_id, status, assigned_at, completed_at")
        .eq("workspace_id", wsId)
        .in("bot_id", botIds)
        .gte("created_at", sevenDaysAgo.toISOString());

      const map: Record<string, AgentPerfStat> = {};
      for (const id of botIds) {
        map[id] = { botId: id, total: 0, completed: 0, failed: 0, open: 0, avgCompletionMs: 0 };
      }

      const completionTimes: Record<string, number[]> = {};
      for (const id of botIds) completionTimes[id] = [];

      for (const wi of items || []) {
        if (!wi.bot_id || !map[wi.bot_id]) continue;
        const m = map[wi.bot_id];
        m.total++;
        if (wi.status === "completed") {
          m.completed++;
          if (wi.assigned_at && wi.completed_at) {
            const ms = new Date(wi.completed_at).getTime() - new Date(wi.assigned_at).getTime();
            if (ms > 0) completionTimes[wi.bot_id].push(ms);
          }
        } else if (wi.status === "failed") {
          m.failed++;
        } else if (["pending", "assigned", "in_progress"].includes(wi.status)) {
          m.open++;
        }
      }

      for (const id of botIds) {
        const times = completionTimes[id];
        if (times.length > 0) {
          map[id].avgCompletionMs = times.reduce((a, b) => a + b, 0) / times.length;
        }
      }

      return Object.values(map).filter((s) => s.total > 0);
    },
    enabled: !!wsId,
    refetchInterval: 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────
export function useCreateWorkItem() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: {
      bot_id?: string;
      entity_type: string;
      entity_id?: string;
      work_type: string;
      priority?: number;
      payload_json?: Record<string, unknown>;
    }) => {
      if (!wsId) throw new Error("No workspace");
      const { data, error } = await (supabase as any)
        .from("agent_work_items")
        .insert({
          workspace_id: wsId,
          ...input,
          status: input.bot_id ? "assigned" : "pending",
          assigned_at: input.bot_id ? new Date().toISOString() : null,
          routed_by: "manual",
        })
        .select()
        .single();
      if (error) throw error;

      // Emit kernel event
      try {
        await supabase.functions.invoke("kernel-ingest-event", {
          body: {
            workspace_id: wsId,
            type: "AGENT.WORK_ITEM_CREATED",
            entity_kind: input.entity_type,
            entity_id: input.entity_id || data.id,
            actor_type: "user",
            source_module: "agent-ops",
            payload: { work_item_id: data.id, work_type: input.work_type, bot_id: input.bot_id },
            schema_version: 1,
            occurred_at: new Date().toISOString(),
          },
        });
      } catch (_) { /* fire and forget */ }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-work-items", wsId] });
      qc.invalidateQueries({ queryKey: ["agent-ops-stats", wsId] });
      qc.invalidateQueries({ queryKey: ["agent-perf-stats", wsId] });
      toast.success("Work item criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompleteWorkItem() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ id, status, error_message }: { id: string; status: "completed" | "failed"; error_message?: string }) => {
      const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "failed") {
        updates.failed_at = new Date().toISOString();
        updates.error_message = error_message || null;
      }
      const { error } = await (supabase as any)
        .from("agent_work_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;

      // Emit kernel event
      try {
        const eventType = status === "completed" ? "AGENT.WORK_COMPLETED" : "AGENT.WORK_FAILED";
        await supabase.functions.invoke("kernel-ingest-event", {
          body: {
            workspace_id: wsId,
            type: eventType,
            entity_kind: "agent_work_item",
            entity_id: id,
            actor_type: "system",
            source_module: "agent-ops",
            payload: { work_item_id: id, status, error_message },
            schema_version: 1,
            occurred_at: new Date().toISOString(),
          },
        });
      } catch (_) { /* fire and forget */ }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-work-items", wsId] });
      qc.invalidateQueries({ queryKey: ["agent-ops-stats", wsId] });
      qc.invalidateQueries({ queryKey: ["agent-perf-stats", wsId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateHandoff() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: {
      from_bot_id?: string;
      to_bot_id?: string;
      to_user_id?: string;
      entity_type: string;
      entity_id?: string;
      trigger_type: string;
      trigger_reason?: string;
      context_snapshot?: Record<string, unknown>;
    }) => {
      if (!wsId) throw new Error("No workspace");
      const { data, error } = await (supabase as any)
        .from("agent_handoffs")
        .insert({
          workspace_id: wsId,
          ...input,
          status: input.to_user_id ? "escalated_to_human" : "pending",
        })
        .select()
        .single();
      if (error) throw error;

      // Emit kernel event
      try {
        await supabase.functions.invoke("kernel-ingest-event", {
          body: {
            workspace_id: wsId,
            type: "AGENT.HANDOFF_CREATED",
            entity_kind: input.entity_type,
            entity_id: input.entity_id || data.id,
            actor_type: "system",
            source_module: "agent-ops",
            payload: { handoff_id: data.id, from_bot_id: input.from_bot_id, to_bot_id: input.to_bot_id, trigger_type: input.trigger_type },
            schema_version: 1,
            occurred_at: new Date().toISOString(),
          },
        });
      } catch (_) { /* fire and forget */ }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-handoffs", wsId] });
      qc.invalidateQueries({ queryKey: ["agent-ops-stats", wsId] });
      toast.success("Handoff criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompleteHandoff() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "completed" | "failed" }) => {
      const { error } = await (supabase as any)
        .from("agent_handoffs")
        .update({ status, completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Emit kernel event
      try {
        await supabase.functions.invoke("kernel-ingest-event", {
          body: {
            workspace_id: wsId,
            type: "AGENT.HANDOFF_COMPLETED",
            entity_kind: "agent_handoff",
            entity_id: id,
            actor_type: "system",
            source_module: "agent-ops",
            payload: { handoff_id: id, status },
            schema_version: 1,
            occurred_at: new Date().toISOString(),
          },
        });
      } catch (_) { /* fire and forget */ }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-handoffs", wsId] });
      qc.invalidateQueries({ queryKey: ["agent-ops-stats", wsId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
