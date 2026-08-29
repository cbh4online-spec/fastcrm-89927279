/**
 * Centro de comunicações — leituras agregadas do módulo "Contacto 1:1 validado".
 * Todas as consultas são filtradas por workspace e protegidas por RLS.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { OutreachEntityType, OutreachEvent, OutreachSuppression } from "../types";

const db = () => supabase as any;

export interface OutreachActivityFilters {
  entityType?: OutreachEntityType | "all";
  channel?: string | "all";
  eventType?: string | "all";
}

export function useOutreachActivityEvents(filters: OutreachActivityFilters, limit = 100) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-activity-events", currentWorkspace?.id, filters, limit],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      let q = db()
        .from("outreach_events")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (filters.entityType && filters.entityType !== "all") q = q.eq("entity_type", filters.entityType);
      if (filters.channel && filters.channel !== "all") q = q.eq("channel", filters.channel);
      if (filters.eventType && filters.eventType !== "all") q = q.eq("event_type", filters.eventType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OutreachEvent[];
    },
  });
}

export interface OutreachAttemptRow {
  id: string;
  entity_type: OutreachEntityType;
  entity_id: string;
  outcome: "blocked" | "simulated" | "sent" | "error";
  mode: string;
  blocked_reason: string | null;
  created_at: string;
}

export function useOutreachWorkspaceAttempts(limit = 100) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-activity-attempts", currentWorkspace?.id, limit],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_send_attempts")
        .select("id, entity_type, entity_id, outcome, mode, blocked_reason, created_at")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as OutreachAttemptRow[];
    },
  });
}

export function useOutreachWorkspaceSuppressions(limit = 100) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["outreach-activity-suppressions", currentWorkspace?.id, limit],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await db()
        .from("outreach_suppressions")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as OutreachSuppression[];
    },
  });
}
