import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  groupAppointmentsByDate,
  isToday,
  isThisWeek,
  isThisMonth,
  isOverdue,
} from "@/utils/leadchef/date";
import type {
  LeadChefAppointment,
  LeadChefAgendaPeriod,
  LeadChefAgendaData,
  LeadChefAppointmentType,
} from "@/types/leadchef";

interface Options {
  period?: LeadChefAgendaPeriod;
  type?: LeadChefAppointmentType | "all";
  leadId?: string;
  limit?: number;
}

export function useLeadChefAgenda(opts: Options = {}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { period = "today", type = "all", leadId, limit = 200 } = opts;

  const query = useQuery({
    queryKey: ["leadchef-agenda", workspaceId, leadId ?? null, type],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefAppointment[]> => {
      if (!workspaceId) return [];
      let q = (supabase as any)
        .from("leadchef_appointments")
        .select(
          "*, lead:leads(id,name,phone,email)"
        )
        .eq("workspace_id", workspaceId)
        .order("scheduled_at", { ascending: true })
        .limit(limit);
      if (leadId) q = q.eq("lead_id", leadId);
      if (type !== "all") q = q.eq("type", type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LeadChefAppointment[];
    },
  });

  const data: LeadChefAgendaData = useMemo(() => {
    const all = query.data ?? [];

    // Marcar overdue dinâmico (status visual): scheduled + scheduled_at < now
    const enriched = all.map((a) =>
      a.status === "scheduled" && isOverdue(a.scheduled_at)
        ? { ...a, status: "overdue" as const }
        : a
    );

    const counters = {
      total: enriched.length,
      today: enriched.filter((a) => isToday(a.scheduled_at)).length,
      week: enriched.filter((a) => isThisWeek(a.scheduled_at)).length,
      month: enriched.filter((a) => isThisMonth(a.scheduled_at)).length,
      overdue: enriched.filter(
        (a) => a.status !== "completed" && a.status !== "cancelled" && isOverdue(a.scheduled_at)
      ).length,
    };

    let filtered = enriched;
    if (period === "today") filtered = enriched.filter((a) => isToday(a.scheduled_at));
    else if (period === "week") filtered = enriched.filter((a) => isThisWeek(a.scheduled_at));
    else if (period === "month") filtered = enriched.filter((a) => isThisMonth(a.scheduled_at));
    else if (period === "overdue")
      filtered = enriched.filter(
        (a) => a.status !== "completed" && a.status !== "cancelled" && isOverdue(a.scheduled_at)
      );

    return {
      groups: groupAppointmentsByDate(filtered),
      counters,
    };
  }, [query.data, period]);

  return { ...query, agenda: data };
}
