import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PerformanceGoal } from "./usePerformanceGoals";
import { differenceInDays, parseISO, isAfter, isBefore } from "date-fns";

export type GoalStatus = "on_track" | "at_risk" | "behind" | "exceeded" | "not_started" | "completed";

export interface GoalProgress {
  currentValue: number;
  percentage: number;
  status: GoalStatus;
  projectedValue: number;
  daysElapsed: number;
  daysTotal: number;
  timePercentage: number;
}

const GOAL_TYPE_CONFIG: Record<string, {
  table: string;
  mode: "count" | "sum";
  sumField?: string;
  filter?: Record<string, string>;
  icon: string;
  label: string;
  unit: string;
}> = {
  revenue: {
    table: "opportunities",
    mode: "sum",
    sumField: "value",
    filter: { status: "won" },
    icon: "TrendingUp",
    label: "Faturação",
    unit: "€",
  },
  leads: {
    table: "leads",
    mode: "count",
    icon: "Users",
    label: "Leads Captados",
    unit: "nº",
  },
  proposals: {
    table: "proposals",
    mode: "count",
    icon: "FileText",
    label: "Propostas Enviadas",
    unit: "nº",
  },
  deals: {
    table: "opportunities",
    mode: "count",
    filter: { status: "won" },
    icon: "Handshake",
    label: "Negócios Fechados",
    unit: "nº",
  },
  meetings: {
    table: "leads",
    mode: "count",
    filter: { status: "meeting" },
    icon: "Calendar",
    label: "Reuniões",
    unit: "nº",
  },
  pipeline: {
    table: "opportunities",
    mode: "sum",
    sumField: "value",
    filter: { status: "open" },
    icon: "BarChart3",
    label: "Pipeline",
    unit: "€",
  },
};

export const GOAL_PRESETS = Object.entries(GOAL_TYPE_CONFIG).map(([key, cfg]) => ({
  value: key,
  icon: cfg.icon,
  label: cfg.label,
  unit: cfg.unit,
  table: cfg.table,
}));

function computeStatus(percentage: number, timePercentage: number): GoalStatus {
  if (percentage >= 100) return "exceeded";
  if (timePercentage <= 0) return "not_started";
  if (timePercentage >= 100) return percentage >= 100 ? "completed" : "behind";
  const pace = percentage / timePercentage;
  if (pace >= 0.9) return "on_track";
  if (pace >= 0.6) return "at_risk";
  return "behind";
}

export function useGoalProgress(goal: PerformanceGoal | null) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["goal-progress", goal?.id, wid],
    enabled: !!goal && !!wid,
    staleTime: 60_000,
    queryFn: async (): Promise<GoalProgress> => {
      if (!goal || !wid) throw new Error("Missing goal or workspace");

      const config = GOAL_TYPE_CONFIG[goal.goal_type];
      if (!config) {
        return { currentValue: 0, percentage: 0, status: "not_started", projectedValue: 0, daysElapsed: 0, daysTotal: 0, timePercentage: 0 };
      }

      const now = new Date();
      const start = parseISO(goal.period_start);
      const end = parseISO(goal.period_end);
      const daysTotal = Math.max(differenceInDays(end, start), 1);
      const daysElapsed = Math.max(0, Math.min(differenceInDays(now, start), daysTotal));
      const timePercentage = Math.round((daysElapsed / daysTotal) * 100);

      let currentValue = 0;

      if (config.mode === "count") {
        let query = supabase
          .from(config.table as any)
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wid)
          .gte("created_at", goal.period_start)
          .lte("created_at", goal.period_end);

        if (config.filter) {
          for (const [key, val] of Object.entries(config.filter)) {
            query = query.eq(key, val);
          }
        }

        const { count, error } = await query;
        if (error) throw error;
        currentValue = count || 0;
      } else if (config.mode === "sum") {
        let query = supabase
          .from(config.table as any)
          .select(config.sumField!)
          .eq("workspace_id", wid)
          .gte("created_at", goal.period_start)
          .lte("created_at", goal.period_end);

        if (config.filter) {
          for (const [key, val] of Object.entries(config.filter)) {
            query = query.eq(key, val);
          }
        }

        const { data, error } = await query;
        if (error) throw error;
        currentValue = (data || []).reduce((sum: number, row: any) => sum + (Number(row[config.sumField!]) || 0), 0);
      }

      const percentage = goal.target_value > 0 ? Math.round((currentValue / goal.target_value) * 100) : 0;
      const status = computeStatus(percentage, timePercentage);
      const projectedValue = daysElapsed > 0 ? Math.round((currentValue / daysElapsed) * daysTotal) : 0;

      return { currentValue, percentage, status, projectedValue, daysElapsed, daysTotal, timePercentage };
    },
  });
}

export function useAllGoalsProgress(goals: PerformanceGoal[] | undefined) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["all-goals-progress", wid, goals?.map(g => g.id).join(",")],
    enabled: !!wid && !!goals && goals.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, GoalProgress>> => {
      if (!goals || !wid) return {};

      const results: Record<string, GoalProgress> = {};

      await Promise.all(goals.map(async (goal) => {
        const config = GOAL_TYPE_CONFIG[goal.goal_type];
        if (!config) {
          results[goal.id] = { currentValue: 0, percentage: 0, status: "not_started", projectedValue: 0, daysElapsed: 0, daysTotal: 0, timePercentage: 0 };
          return;
        }

        const now = new Date();
        const start = parseISO(goal.period_start);
        const end = parseISO(goal.period_end);
        const daysTotal = Math.max(differenceInDays(end, start), 1);
        const daysElapsed = Math.max(0, Math.min(differenceInDays(now, start), daysTotal));
        const timePercentage = Math.round((daysElapsed / daysTotal) * 100);

        let currentValue = 0;

        try {
          if (config.mode === "count") {
            let query = supabase
              .from(config.table as any)
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", wid)
              .gte("created_at", goal.period_start)
              .lte("created_at", goal.period_end);

            if (config.filter) {
              for (const [key, val] of Object.entries(config.filter)) {
                query = query.eq(key, val);
              }
            }

            const { count } = await query;
            currentValue = count || 0;
          } else if (config.mode === "sum") {
            let query = supabase
              .from(config.table as any)
              .select(config.sumField!)
              .eq("workspace_id", wid)
              .gte("created_at", goal.period_start)
              .lte("created_at", goal.period_end);

            if (config.filter) {
              for (const [key, val] of Object.entries(config.filter)) {
                query = query.eq(key, val);
              }
            }

            const { data } = await query;
            currentValue = (data || []).reduce((sum: number, row: any) => sum + (Number(row[config.sumField!]) || 0), 0);
          }
        } catch {
          currentValue = 0;
        }

        const percentage = goal.target_value > 0 ? Math.round((currentValue / goal.target_value) * 100) : 0;
        const status = computeStatus(percentage, timePercentage);
        const projectedValue = daysElapsed > 0 ? Math.round((currentValue / daysElapsed) * daysTotal) : 0;

        results[goal.id] = { currentValue, percentage, status, projectedValue, daysElapsed, daysTotal, timePercentage };
      }));

      return results;
    },
  });
}
