import { useMemo } from "react";
import { useSubscriptions } from "./useSubscriptions";
import { calculateMRR } from "@/types/subscription";
import type { Subscription, BillingFrequency } from "@/types/subscription";
import { startOfMonth, subMonths, differenceInDays, parseISO } from "date-fns";

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
  churnedMRR: number;
  netMRRChange: number;
  
  // Rates
  churnRate: number;
  retentionRate: number;
  
  // Customer metrics
  totalCustomers: number;
  avgRevenuePerCustomer: number;
  ltvEstimate: number;
  
  // Trends
  mrrGrowthRate: number;
  subscriptionGrowthRate: number;
}

export function useSaaSMetrics() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();

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
      return sum + calculateMRR(sub.mrr_amount, sub.frequency);
    }, 0);

    const arr = mrr * 12;

    // Subscriptions created this month
    const newThisMonth = subscriptions.filter(
      (s) => new Date(s.created_at) >= startOfThisMonth && s.status === "active"
    );
    const newMRR = newThisMonth.reduce((sum, sub) => {
      return sum + calculateMRR(sub.mrr_amount, sub.frequency);
    }, 0);

    // Cancelled this month
    const cancelledThisMonth = subscriptions.filter(
      (s) =>
        s.status === "canceled" &&
        s.canceled_at &&
        new Date(s.canceled_at) >= startOfThisMonth
    );
    const churnedMRR = cancelledThisMonth.reduce((sum, sub) => {
      return sum + calculateMRR(sub.mrr_amount, sub.frequency);
    }, 0);

    // Calculate churn rate
    const activeAtStartOfMonth = subscriptions.filter(
      (s) =>
        new Date(s.created_at) < startOfThisMonth &&
        (!s.canceled_at || new Date(s.canceled_at) >= startOfThisMonth)
    );
    const churnRate =
      activeAtStartOfMonth.length > 0
        ? (cancelledThisMonth.length / activeAtStartOfMonth.length) * 100
        : 0;

    const retentionRate = 100 - churnRate;

    // Customer count
    const uniqueCustomers = new Set<string>();
    activeSubscriptions.forEach((sub) => {
      if (sub.contact_id) uniqueCustomers.add(`contact:${sub.contact_id}`);
      if (sub.company_id) uniqueCustomers.add(`company:${sub.company_id}`);
    });

    const totalCustomers = uniqueCustomers.size;
    const avgRevenuePerCustomer = totalCustomers > 0 ? mrr / totalCustomers : 0;

    // LTV Estimate
    const monthlyChurnRate = churnRate / 100;
    const ltvEstimate =
      monthlyChurnRate > 0 ? avgRevenuePerCustomer / monthlyChurnRate : avgRevenuePerCustomer * 24;

    // Calculate trends
    const lastMonthActive = subscriptions.filter(
      (s) =>
        new Date(s.created_at) < startOfThisMonth &&
        (!s.canceled_at || new Date(s.canceled_at) >= startOfLastMonth)
    );
    const lastMonthMRR = lastMonthActive.reduce((sum, sub) => {
      return sum + calculateMRR(sub.mrr_amount, sub.frequency);
    }, 0);

    const mrrGrowthRate =
      lastMonthMRR > 0 ? ((mrr - lastMonthMRR) / lastMonthMRR) * 100 : 0;

    const subscriptionGrowthRate =
      lastMonthActive.length > 0
        ? ((activeSubscriptions.length - lastMonthActive.length) / lastMonthActive.length) * 100
        : 0;

    const netMRRChange = newMRR - churnedMRR;

    return {
      mrr,
      arr,
      activeSubscriptions: activeSubscriptions.length,
      totalSubscriptions: subscriptions.length,
      newMRR,
      churnedMRR,
      netMRRChange,
      churnRate,
      retentionRate,
      totalCustomers,
      avgRevenuePerCustomer,
      ltvEstimate,
      mrrGrowthRate,
      subscriptionGrowthRate,
    };
  }, [subscriptions]);

  return {
    metrics,
    isLoading,
    subscriptions,
  };
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
        if (!sub.next_payment_date) return false;
        const nextPayment = parseISO(sub.next_payment_date);
        return nextPayment >= now && nextPayment <= cutoff;
      })
      .sort((a, b) => {
        const dateA = a.next_payment_date ? parseISO(a.next_payment_date).getTime() : 0;
        const dateB = b.next_payment_date ? parseISO(b.next_payment_date).getTime() : 0;
        return dateA - dateB;
      })
      .map((sub) => ({
        ...sub,
        daysUntilRenewal: sub.next_payment_date
          ? differenceInDays(parseISO(sub.next_payment_date), now)
          : null,
      }));
  }, [subscriptions, daysAhead]);

  return { upcomingRenewals, isLoading };
}

// =====================================================
// AT-RISK SUBSCRIPTIONS
// =====================================================

export interface AtRiskSubscription extends Subscription {
  riskScore: number;
  riskFactors: string[];
}

export function useAtRiskSubscriptions() {
  const { data: subscriptions = [], isLoading } = useSubscriptions({ status: "active" });

  const atRiskSubscriptions = useMemo<AtRiskSubscription[]>(() => {
    const now = new Date();

    return subscriptions
      .map((sub) => {
        const riskFactors: string[] = [];
        let riskScore = 0;

        // Check for past due status
        if (sub.status === "past_due") {
          riskScore += 40;
          riskFactors.push("Subscrição em atraso");
        }

        // Check if cancel_at_period_end is set
        if (sub.cancel_at_period_end) {
          riskScore += 30;
          riskFactors.push("Cancelamento agendado");
        }

        // Check if renewal_date is approaching
        if (sub.renewal_date) {
          const daysUntilRenewal = differenceInDays(parseISO(sub.renewal_date), now);
          if (daysUntilRenewal <= 30 && daysUntilRenewal > 0) {
            riskScore += 15;
            riskFactors.push(`Renovação em ${daysUntilRenewal} dias`);
          }
        }

        return {
          ...sub,
          riskScore: Math.min(riskScore, 100),
          riskFactors,
        };
      })
      .filter((sub) => sub.riskScore >= 20)
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [subscriptions]);

  return {
    atRiskSubscriptions,
    isLoading,
  };
}
