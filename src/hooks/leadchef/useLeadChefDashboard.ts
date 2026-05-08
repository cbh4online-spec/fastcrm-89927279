import { useMemo } from "react";
import { useLeadChefCurrentGoal } from "./useLeadChefCurrentGoal";
import { useLeadChefMonthlyProgress } from "./useLeadChefMonthlyProgress";
import { startOfMonthIso, calculateGoalProgress } from "@/utils/leadchef/goals";
import type { LeadChefGoal } from "@/types/leadchef";

export interface LeadChefDashboardAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  action?: { label: string; to: string };
}

export interface LeadChefNextBestAction {
  id: string;
  title: string;
  hint?: string;
  to?: string;
}

export interface LeadChefDashboardData {
  selectedMonth: string;
  goals: LeadChefGoal | null;
  progress: ReturnType<typeof useLeadChefMonthlyProgress>["data"];
  conversion: {
    leadToDemoRate: number;
    demoToSaleRate: number;
    leadToSaleRate: number;
  };
  alerts: LeadChefDashboardAlert[];
  stageDistribution: Record<string, number>;
  nextBestActions: LeadChefNextBestAction[];
}

export function useLeadChefDashboard(periodMonth?: string) {
  const month = periodMonth ?? startOfMonthIso();
  const goalQ = useLeadChefCurrentGoal(month);
  const progressQ = useLeadChefMonthlyProgress(month);

  const isLoading = goalQ.isLoading || progressQ.isLoading;
  const isError = goalQ.isError || progressQ.isError;

  const data: LeadChefDashboardData | null = useMemo(() => {
    const goals = goalQ.data ?? null;
    const progress = progressQ.data;
    if (!progress) return null;

    const leadToDemo = progress.leadsCreated > 0
      ? Math.round((progress.demosScheduled / progress.leadsCreated) * 100)
      : 0;
    const demoToSale = progress.demosCompleted > 0
      ? Math.round((progress.salesWon / progress.demosCompleted) * 100)
      : 0;
    const leadToSale = progress.leadsCreated > 0
      ? Math.round((progress.salesWon / progress.leadsCreated) * 100)
      : 0;

    const alerts: LeadChefDashboardAlert[] = [];
    if (progress.overdueActions > 0) {
      alerts.push({
        id: "overdue",
        severity: "critical",
        title: `${progress.overdueActions} ações em atraso`,
        description: "Recupera o contacto antes que arrefeça.",
        action: { label: "Ver agenda", to: "/dashboard/leadchef/agenda" },
      });
    }
    if (progress.proposals > 0) {
      alerts.push({
        id: "proposals",
        severity: "warning",
        title: `${progress.proposals} propostas pendentes`,
        description: "Faz follow-up para fechar a decisão.",
        action: { label: "Ver leads", to: "/dashboard/leadchef/leads" },
      });
    }
    if (
      goals && goals.demos_goal > 0 &&
      progress.demosCompleted < goals.demos_goal &&
      progress.demosScheduled < goals.demos_goal
    ) {
      const missing = goals.demos_goal - progress.demosScheduled;
      if (missing > 0) {
        alerts.push({
          id: "demos-gap",
          severity: "info",
          title: `Faltam ${missing} demonstrações para o objetivo`,
          description: "Marca novas demonstrações para chegar à meta do mês.",
          action: { label: "Ver agenda", to: "/dashboard/leadchef/agenda" },
        });
      }
    }
    if (alerts.length === 0) {
      alerts.push({
        id: "ok",
        severity: "info",
        title: "Tudo em dia",
        description: "Continua o bom trabalho.",
      });
    }

    const nextBestActions: LeadChefNextBestAction[] = [];
    if (progress.overdueActions > 0) {
      nextBestActions.push({
        id: "nba-overdue",
        title: `Recuperar ${progress.overdueActions} ações em atraso`,
        to: "/dashboard/leadchef/agenda",
      });
    }
    if (goals && goals.contacts_goal > 0 && progress.contactsMade < goals.contacts_goal) {
      const missing = goals.contacts_goal - progress.contactsMade;
      nextBestActions.push({
        id: "nba-contacts",
        title: `Fazer ${missing} contactos para chegar ao objetivo`,
        to: "/dashboard/leadchef/leads",
      });
    }
    if (goals && goals.demos_goal > 0 && progress.demosScheduled < goals.demos_goal) {
      const missing = goals.demos_goal - progress.demosScheduled;
      nextBestActions.push({
        id: "nba-demos",
        title: `Marcar ${missing} demonstrações`,
        to: "/dashboard/leadchef/agenda",
      });
    }
    if (progress.proposals > 0) {
      nextBestActions.push({
        id: "nba-proposals",
        title: `Fechar ${progress.proposals} propostas pendentes`,
        to: "/dashboard/leadchef/leads",
      });
    }
    if (nextBestActions.length === 0) {
      nextBestActions.push({
        id: "nba-default",
        title: "Cria 1 novo lead hoje",
        hint: "Manter o pipeline cheio é a base do mês.",
        to: "/dashboard/leadchef/leads",
      });
    }

    const _ = calculateGoalProgress; // ensure import stays
    return {
      selectedMonth: month,
      goals,
      progress,
      conversion: { leadToDemoRate: leadToDemo, demoToSaleRate: demoToSale, leadToSaleRate: leadToSale },
      alerts,
      stageDistribution: progress.stageDistribution,
      nextBestActions: nextBestActions.slice(0, 3),
    };
  }, [goalQ.data, progressQ.data, month]);

  return { data, isLoading, isError, refetch: () => { goalQ.refetch(); progressQ.refetch(); } };
}
