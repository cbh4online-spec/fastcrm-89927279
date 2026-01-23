import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useSubscriptions, useBillingRecords } from "./useSubscriptions";
import { calculateMRR, BILLING_CYCLE_MONTHS } from "@/types/subscription";
import type { Subscription, SubscriptionBillingRecord, SubscriptionMetrics } from "@/types/subscription";
import { startOfMonth, subMonths, format, differenceInDays, parseISO } from "date-fns";

// =====================================================
// REAL-TIME SAAS METRICS CALCULATION
// =====================================================

export interface SaaSMetricsData {
  // Current MRR/ARR
  mrr: number;
  arr: number;
  
  // Subscription counts
  activeSubscriptions: number;
  totalSubscriptions: number;
  
  // Revenue breakdown (current month)
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  netMRRChange: number;
  
  // Rates
  churnRate: number;
  retentionRate: number;
  netRevenueRetention: number;
  
  // Customer metrics
  totalCustomers: number;
  avgRevenuePerCustomer: number;
  ltvEstimate: number;
  
  // Billing
  pendingBillingAmount: number;
  paidThisMonth: number;
  
  // Trends
  mrrGrowthRate: number;
  subscriptionGrowthRate: number;
}

export function useSaaSMetrics() {
  const { workspaceClient, currentWorkspace } = useWorkspaceInstanceContext();
  const { data: subscriptions = [], isLoading: subsLoading } = useSubscriptions();
  const { data: billingRecords = [], isLoading: billingLoading } = useBillingRecords();

  const metrics = useMemo<SaaSMetricsData>(() => {
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));

    // Filter active subscriptions
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active" || s.status === "past_due"
    );

    // Calculate current MRR
    const mrr = activeSubscriptions.reduce((sum, sub) => {
      return sum + calculateMRR(sub.amount, sub.billing_cycle);
    }, 0);

    const arr = mrr * 12;

    // Subscriptions created this month
    const newThisMonth = subscriptions.filter(
      (s) => new Date(s.created_at) >= startOfThisMonth && s.status === "active"
    );
    const newMRR = newThisMonth.reduce((sum, sub) => {
      return sum + calculateMRR(sub.amount, sub.billing_cycle);
    }, 0);

    // Cancelled this month
    const cancelledThisMonth = subscriptions.filter(
      (s) =>
        s.status === "cancelled" &&
        s.cancelled_at &&
        new Date(s.cancelled_at) >= startOfThisMonth
    );
    const churnedMRR = cancelledThisMonth.reduce((sum, sub) => {
      return sum + calculateMRR(sub.amount, sub.billing_cycle);
    }, 0);

    // Calculate churn rate (cancelled / total at start of month)
    const activeAtStartOfMonth = subscriptions.filter(
      (s) =>
        new Date(s.created_at) < startOfThisMonth &&
        (!s.cancelled_at || new Date(s.cancelled_at) >= startOfThisMonth)
    );
    const churnRate =
      activeAtStartOfMonth.length > 0
        ? (cancelledThisMonth.length / activeAtStartOfMonth.length) * 100
        : 0;

    const retentionRate = 100 - churnRate;

    // Calculate Net Revenue Retention (NRR)
    // (MRR at start + expansion - contraction - churn) / MRR at start * 100
    const mrrAtStartOfMonth = activeAtStartOfMonth.reduce((sum, sub) => {
      return sum + calculateMRR(sub.amount, sub.billing_cycle);
    }, 0);
    const netRevenueRetention =
      mrrAtStartOfMonth > 0
        ? ((mrr + churnedMRR) / mrrAtStartOfMonth) * 100
        : 100;

    // Customer count (unique contacts/companies with active subscriptions)
    const uniqueCustomers = new Set<string>();
    activeSubscriptions.forEach((sub) => {
      if (sub.contact_id) uniqueCustomers.add(`contact:${sub.contact_id}`);
      if (sub.company_id) uniqueCustomers.add(`company:${sub.company_id}`);
      if (!sub.contact_id && !sub.company_id && sub.lead_id) {
        uniqueCustomers.add(`lead:${sub.lead_id}`);
      }
    });

    const totalCustomers = uniqueCustomers.size;
    const avgRevenuePerCustomer = totalCustomers > 0 ? mrr / totalCustomers : 0;

    // LTV Estimate = ARPU / Monthly Churn Rate
    const monthlyChurnRate = churnRate / 100;
    const ltvEstimate =
      monthlyChurnRate > 0 ? avgRevenuePerCustomer / monthlyChurnRate : avgRevenuePerCustomer * 24;

    // Billing stats
    const pendingRecords = billingRecords.filter((r) => r.status === "pending");
    const pendingBillingAmount = pendingRecords.reduce((sum, r) => sum + r.amount, 0);

    const paidThisMonth = billingRecords
      .filter(
        (r) =>
          r.status === "paid" &&
          r.paid_at &&
          new Date(r.paid_at) >= startOfThisMonth
      )
      .reduce((sum, r) => sum + r.amount, 0);

    // Calculate trends (vs last month)
    const lastMonthActive = subscriptions.filter(
      (s) =>
        new Date(s.created_at) < startOfThisMonth &&
        (!s.cancelled_at || new Date(s.cancelled_at) >= startOfLastMonth)
    );
    const lastMonthMRR = lastMonthActive.reduce((sum, sub) => {
      return sum + calculateMRR(sub.amount, sub.billing_cycle);
    }, 0);

    const mrrGrowthRate =
      lastMonthMRR > 0 ? ((mrr - lastMonthMRR) / lastMonthMRR) * 100 : 0;

    const subscriptionGrowthRate =
      lastMonthActive.length > 0
        ? ((activeSubscriptions.length - lastMonthActive.length) / lastMonthActive.length) * 100
        : 0;

    // Net MRR change
    const netMRRChange = newMRR - churnedMRR;

    return {
      mrr,
      arr,
      activeSubscriptions: activeSubscriptions.length,
      totalSubscriptions: subscriptions.length,
      newMRR,
      expansionMRR: 0, // Would need historical data to calculate
      contractionMRR: 0, // Would need historical data to calculate
      churnedMRR,
      netMRRChange,
      churnRate,
      retentionRate,
      netRevenueRetention,
      totalCustomers,
      avgRevenuePerCustomer,
      ltvEstimate,
      pendingBillingAmount,
      paidThisMonth,
      mrrGrowthRate,
      subscriptionGrowthRate,
    };
  }, [subscriptions, billingRecords]);

  return {
    metrics,
    isLoading: subsLoading || billingLoading,
    subscriptions,
    billingRecords,
  };
}

// =====================================================
// HISTORICAL METRICS (from subscription_metrics table)
// =====================================================

export function useSubscriptionMetricsHistory(periodType: "daily" | "monthly" = "monthly") {
  const { workspaceClient, currentWorkspace } = useWorkspaceInstanceContext();

  return useQuery({
    queryKey: ["subscription-metrics", currentWorkspace?.id, periodType],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("subscription_metrics")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("period_type", periodType)
        .order("period_date", { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as SubscriptionMetrics[];
    },
    enabled: !!workspaceClient && !!currentWorkspace,
  });
}

// =====================================================
// COHORT ANALYSIS
// =====================================================

export interface CohortData {
  cohort: string; // Month of acquisition
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month4: number;
  month5: number;
  month6: number;
  month7: number;
  month8: number;
  month9: number;
  month10: number;
  month11: number;
}

export function useCohortAnalysis() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();

  const cohorts = useMemo(() => {
    const now = new Date();
    const cohortMap = new Map<string, Map<number, number>>();

    // Group subscriptions by acquisition month
    subscriptions.forEach((sub) => {
      const createdAt = parseISO(sub.created_at);
      const cohortKey = format(createdAt, "yyyy-MM");
      
      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, new Map());
      }

      const cohort = cohortMap.get(cohortKey)!;
      const mrr = calculateMRR(sub.amount, sub.billing_cycle);

      // Calculate retention for each month
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(createdAt);
        monthDate.setMonth(monthDate.getMonth() + month);

        if (monthDate > now) break;

        // Check if subscription was active at this point
        const wasActive =
          sub.status === "active" ||
          (sub.cancelled_at && new Date(sub.cancelled_at) > monthDate);

        if (wasActive) {
          const currentValue = cohort.get(month) || 0;
          cohort.set(month, currentValue + mrr);
        }
      }
    });

    // Convert to array format
    const result: CohortData[] = [];
    cohortMap.forEach((months, cohortKey) => {
      const month0 = months.get(0) || 0;
      if (month0 === 0) return;

      result.push({
        cohort: cohortKey,
        month0: 100,
        month1: month0 > 0 ? ((months.get(1) || 0) / month0) * 100 : 0,
        month2: month0 > 0 ? ((months.get(2) || 0) / month0) * 100 : 0,
        month3: month0 > 0 ? ((months.get(3) || 0) / month0) * 100 : 0,
        month4: month0 > 0 ? ((months.get(4) || 0) / month0) * 100 : 0,
        month5: month0 > 0 ? ((months.get(5) || 0) / month0) * 100 : 0,
        month6: month0 > 0 ? ((months.get(6) || 0) / month0) * 100 : 0,
        month7: month0 > 0 ? ((months.get(7) || 0) / month0) * 100 : 0,
        month8: month0 > 0 ? ((months.get(8) || 0) / month0) * 100 : 0,
        month9: month0 > 0 ? ((months.get(9) || 0) / month0) * 100 : 0,
        month10: month0 > 0 ? ((months.get(10) || 0) / month0) * 100 : 0,
        month11: month0 > 0 ? ((months.get(11) || 0) / month0) * 100 : 0,
      });
    });

    return result.sort((a, b) => b.cohort.localeCompare(a.cohort));
  }, [subscriptions]);

  return { cohorts, isLoading };
}

// =====================================================
// UPCOMING RENEWALS
// =====================================================

export function useUpcomingRenewals(daysAhead: number = 30) {
  const { data: subscriptions = [], isLoading } = useSubscriptions({ status: "active" });

  const upcomingRenewals = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return subscriptions
      .filter((sub) => {
        if (!sub.next_billing_date) return false;
        const nextBilling = parseISO(sub.next_billing_date);
        return nextBilling >= now && nextBilling <= cutoff;
      })
      .sort((a, b) => {
        const dateA = a.next_billing_date ? parseISO(a.next_billing_date).getTime() : 0;
        const dateB = b.next_billing_date ? parseISO(b.next_billing_date).getTime() : 0;
        return dateA - dateB;
      })
      .map((sub) => ({
        ...sub,
        daysUntilRenewal: sub.next_billing_date
          ? differenceInDays(parseISO(sub.next_billing_date), now)
          : null,
      }));
  }, [subscriptions, daysAhead]);

  return { upcomingRenewals, isLoading };
}

// =====================================================
// AT-RISK SUBSCRIPTIONS (CHURN PREDICTION)
// =====================================================

export interface AtRiskSubscription extends Subscription {
  riskScore: number;
  riskFactors: string[];
}

export function useAtRiskSubscriptions() {
  const { data: subscriptions = [], isLoading: subsLoading } = useSubscriptions({ status: "active" });
  const { data: billingRecords = [], isLoading: billingLoading } = useBillingRecords();

  const atRiskSubscriptions = useMemo<AtRiskSubscription[]>(() => {
    const now = new Date();

    return subscriptions
      .map((sub) => {
        const riskFactors: string[] = [];
        let riskScore = 0;

        // Check for failed payments
        const subBillingRecords = billingRecords.filter(
          (r) => r.subscription_id === sub.id
        );
        const failedPayments = subBillingRecords.filter(
          (r) => r.status === "failed"
        );
        if (failedPayments.length > 0) {
          riskScore += 30;
          riskFactors.push(`${failedPayments.length} pagamento(s) falhado(s)`);
        }

        // Check for past due status
        if (sub.status === "past_due") {
          riskScore += 40;
          riskFactors.push("Subscrição em atraso");
        }

        // Check if auto_renew is disabled
        if (!sub.auto_renew) {
          riskScore += 20;
          riskFactors.push("Renovação automática desativada");
        }

        // Check if end_date is approaching
        if (sub.end_date) {
          const daysUntilEnd = differenceInDays(parseISO(sub.end_date), now);
          if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
            riskScore += 15;
            riskFactors.push(`Termina em ${daysUntilEnd} dias`);
          }
        }

        // Check for low engagement (no recent billing)
        const recentBilling = subBillingRecords.filter(
          (r) => differenceInDays(now, parseISO(r.created_at)) <= 90
        );
        if (recentBilling.length === 0 && subBillingRecords.length > 0) {
          riskScore += 10;
          riskFactors.push("Sem atividade de cobrança recente");
        }

        return {
          ...sub,
          riskScore: Math.min(riskScore, 100),
          riskFactors,
        };
      })
      .filter((sub) => sub.riskScore >= 20)
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [subscriptions, billingRecords]);

  return {
    atRiskSubscriptions,
    isLoading: subsLoading || billingLoading,
  };
}
