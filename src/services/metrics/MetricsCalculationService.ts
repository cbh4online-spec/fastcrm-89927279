// ============================================
// METRICS CALCULATION SERVICE
// ============================================
// Central service for all metric calculations.
// No module should calculate metrics independently.

import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  differenceInDays,
  differenceInHours,
  isAfter,
  isBefore,
} from "date-fns";
import {
  ComputedMetric,
  TrendInfo,
  MetricWarning,
  ForecastResult,
  ForecastScenarioData,
  ForecastFactor,
} from "@/types/metrics-governance";
import { METRICS_CATALOG, getMetricDefinition } from "./MetricsCatalog";

// ============================================
// DATA TYPES (Internal)
// ============================================

interface RawDataSources {
  leads: any[];
  opportunities: any[];
  stages: any[];
  conversations: any[];
  automations: any[];
  proposals: any[];
  tasks: any[];
  payments?: any[];
}

interface CalculationContext {
  now: Date;
  today: Date;
  weekStart: Date;
  monthStart: Date;
  lastWeekStart: Date;
  lastMonthStart: Date;
}

// ============================================
// CORE CALCULATION ENGINE
// ============================================

export class MetricsCalculationService {
  private cache: Map<string, { value: ComputedMetric; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute cache

  constructor(private data: RawDataSources) {}

  // Get calculation context
  private getContext(): CalculationContext {
    const now = new Date();
    return {
      now,
      today: startOfDay(now),
      weekStart: startOfWeek(now, { weekStartsOn: 1 }),
      monthStart: startOfMonth(now),
      lastWeekStart: subDays(startOfWeek(now, { weekStartsOn: 1 }), 7),
      lastMonthStart: subDays(startOfMonth(now), 30),
    };
  }

  // Check cache validity
  private isCacheValid(metricId: string): boolean {
    const cached = this.cache.get(metricId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTTL;
  }

  // Get cached or compute metric
  public computeMetric(metricId: string): ComputedMetric {
    if (this.isCacheValid(metricId)) {
      return this.cache.get(metricId)!.value;
    }

    const metric = this.calculateMetric(metricId);
    this.cache.set(metricId, { value: metric, timestamp: Date.now() });
    return metric;
  }

  // Main calculation router
  private calculateMetric(metricId: string): ComputedMetric {
    const definition = getMetricDefinition(metricId);
    if (!definition) {
      return this.createErrorMetric(metricId, "Métrica não encontrada no catálogo");
    }

    const ctx = this.getContext();
    let value: number;
    let warnings: MetricWarning[] = [];
    let dataCompleteness = 100;

    try {
      switch (metricId) {
        // Lead metrics
        case "leads_today":
          value = this.countLeadsInPeriod(ctx.today, ctx.now);
          break;
        case "leads_this_week":
          value = this.countLeadsInPeriod(ctx.weekStart, ctx.now);
          break;
        case "leads_this_month":
          value = this.countLeadsInPeriod(ctx.monthStart, ctx.now);
          break;
        case "lead_to_opportunity_rate":
          value = this.calculateLeadToOpportunityRate();
          break;
        case "avg_response_time":
          const avgResponse = this.calculateAvgResponseTime();
          value = avgResponse.value;
          if (avgResponse.dataPoints < 5) {
            warnings.push({
              type: "incomplete_data",
              message: "Poucos dados para cálculo preciso",
              severity: "info",
            });
            dataCompleteness = Math.min(100, avgResponse.dataPoints * 20);
          }
          break;

        // Opportunity metrics
        case "active_opportunities":
          value = this.countActiveOpportunities();
          break;
        case "total_pipeline_value":
          value = this.calculateTotalPipelineValue();
          break;
        case "weighted_pipeline_value":
          value = this.calculateWeightedPipelineValue();
          break;
        case "close_rate":
          value = this.calculateCloseRate();
          break;
        case "avg_close_time":
          value = this.calculateAvgCloseTime();
          break;

        // Efficiency metrics
        case "stale_opportunities":
          value = this.countStaleOpportunities();
          break;
        case "overdue_followups":
          value = this.countOverdueFollowups();
          break;
        case "active_automations":
          value = this.countActiveAutomations();
          break;
        case "time_saved_hours":
          value = this.countActiveAutomations() * 2;
          break;

        // Forecast metrics
        case "forecast_30d":
          value = this.calculateForecastValue(30);
          break;
        case "forecast_60d":
          value = this.calculateForecastValue(60);
          break;
        case "forecast_90d":
          value = this.calculateForecastValue(90);
          break;

        // Pipeline health
        case "pipeline_health_score":
          value = this.calculatePipelineHealthScore();
          break;

        default:
          return this.createErrorMetric(metricId, "Cálculo não implementado");
      }

      // Calculate trend if applicable
      const trend = this.calculateTrend(metricId, value, ctx);

      return {
        metricId,
        value,
        formattedValue: this.formatValue(value, definition.unit, definition.precision),
        trend,
        confidence: dataCompleteness,
        computedAt: ctx.now.toISOString(),
        dataCompleteness,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return this.createErrorMetric(metricId, "Erro no cálculo");
    }
  }

  // ============================================
  // LEAD CALCULATIONS
  // ============================================

  private countLeadsInPeriod(start: Date, end: Date): number {
    return this.data.leads?.filter(
      (l) => isAfter(new Date(l.created_at), start) && isBefore(new Date(l.created_at), end)
    ).length || 0;
  }

  private calculateLeadToOpportunityRate(): number {
    const totalLeads = this.data.leads?.length || 0;
    if (totalLeads === 0) return 0;
    const leadsWithOpportunity = this.data.opportunities?.filter((o) => o.lead_id).length || 0;
    return Math.round((leadsWithOpportunity / totalLeads) * 1000) / 10;
  }

  private calculateAvgResponseTime(): { value: number; dataPoints: number } {
    let totalHours = 0;
    let count = 0;

    this.data.conversations?.forEach((c) => {
      if (c.last_message_at && c.created_at) {
        const hours = differenceInHours(new Date(c.last_message_at), new Date(c.created_at));
        if (hours > 0 && hours < 168) {
          totalHours += hours;
          count++;
        }
      }
    });

    return {
      value: count > 0 ? Math.round(totalHours / count) : 0,
      dataPoints: count,
    };
  }

  // ============================================
  // OPPORTUNITY CALCULATIONS
  // ============================================

  private countActiveOpportunities(): number {
    return this.data.opportunities?.filter((o) => o.status === "open").length || 0;
  }

  private calculateTotalPipelineValue(): number {
    return (
      this.data.opportunities
        ?.filter((o) => o.status === "open")
        .reduce((sum, o) => sum + Number(o.value || 0), 0) || 0
    );
  }

  private calculateWeightedPipelineValue(): number {
    return Math.round(
      this.data.opportunities
        ?.filter((o) => o.status === "open")
        .reduce((sum, o) => sum + (Number(o.value || 0) * (o.probability || 50)) / 100, 0) || 0
    );
  }

  private calculateCloseRate(): number {
    const won = this.data.opportunities?.filter((o) => o.status === "won").length || 0;
    const lost = this.data.opportunities?.filter((o) => o.status === "lost").length || 0;
    const total = won + lost;
    if (total === 0) return 0;
    return Math.round((won / total) * 1000) / 10;
  }

  private calculateAvgCloseTime(): number {
    const wonOpps = this.data.opportunities?.filter((o) => o.status === "won") || [];
    if (wonOpps.length === 0) return 0;

    const totalDays = wonOpps.reduce((sum, o) => {
      const created = new Date(o.created_at);
      const updated = new Date(o.updated_at);
      return sum + differenceInDays(updated, created);
    }, 0);

    return Math.round(totalDays / wonOpps.length);
  }

  // ============================================
  // EFFICIENCY CALCULATIONS
  // ============================================

  private countStaleOpportunities(staleDays = 7): number {
    const now = new Date();
    return (
      this.data.opportunities?.filter((o) => {
        if (o.status !== "open") return false;
        const lastActivity = o.last_activity_at ? new Date(o.last_activity_at) : new Date(o.updated_at);
        return differenceInDays(now, lastActivity) > staleDays;
      }).length || 0
    );
  }

  private countOverdueFollowups(): number {
    const now = new Date();
    return (
      this.data.tasks?.filter((t) => {
        if (t.status === "done") return false;
        if (!t.due_at) return false;
        return isBefore(new Date(t.due_at), now);
      }).length || 0
    );
  }

  private countActiveAutomations(): number {
    return this.data.automations?.filter((a) => a.is_active).length || 0;
  }

  // ============================================
  // FORECAST CALCULATIONS
  // ============================================

  private calculateForecastValue(days: number): number {
    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const avgCloseTime = this.calculateAvgCloseTime();

    const relevantOpps =
      this.data.opportunities?.filter((o) => {
        if (o.status !== "open") return false;
        if (o.expected_close_date) {
          return new Date(o.expected_close_date) <= targetDate;
        }
        const daysOpen = differenceInDays(now, new Date(o.created_at));
        const expectedCloseInDays = Math.max(0, avgCloseTime - daysOpen);
        return expectedCloseInDays <= days;
      }) || [];

    return Math.round(
      relevantOpps.reduce((sum, o) => sum + (Number(o.value || 0) * (o.probability || 50)) / 100, 0)
    );
  }

  // ============================================
  // PIPELINE HEALTH
  // ============================================

  private calculatePipelineHealthScore(): number {
    const openOpps = this.data.opportunities?.filter((o) => o.status === "open") || [];
    const staleCount = this.countStaleOpportunities();

    // Calculate bottleneck penalty
    const stageGroups = new Map<string, number>();
    openOpps.forEach((o) => {
      const count = stageGroups.get(o.stage_id) || 0;
      stageGroups.set(o.stage_id, count + 1);
    });

    let bottleneckCount = 0;
    stageGroups.forEach((count) => {
      if (count > 3) bottleneckCount++;
    });

    const stalePercent = openOpps.length > 0 ? (staleCount / openOpps.length) * 100 : 0;
    const score = 100 - bottleneckCount * 15 - stalePercent * 0.5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ============================================
  // TREND CALCULATION
  // ============================================

  private calculateTrend(metricId: string, currentValue: number, ctx: CalculationContext): TrendInfo | undefined {
    // Only calculate trends for specific metrics
    const trendableMetrics = [
      "leads_this_week",
      "active_opportunities",
      "total_pipeline_value",
      "weighted_pipeline_value",
      "close_rate",
    ];

    if (!trendableMetrics.includes(metricId)) return undefined;

    let previousValue = 0;

    switch (metricId) {
      case "leads_this_week":
        previousValue = this.countLeadsInPeriod(ctx.lastWeekStart, ctx.weekStart);
        break;
      case "active_opportunities":
      case "total_pipeline_value":
      case "weighted_pipeline_value":
      case "close_rate":
        // For these, we'd need historical data - returning stable for now
        return { direction: "stable", changePercent: 0, period: "vs semana anterior" };
    }

    const changePercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : currentValue > 0 ? 100 : 0;

    let direction: "up" | "down" | "stable" = "stable";
    if (changePercent > 5) direction = "up";
    if (changePercent < -5) direction = "down";

    return {
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      period: "vs semana anterior",
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private formatValue(value: number, unit: string, precision: number): string {
    switch (unit) {
      case "currency":
        return new Intl.NumberFormat("pt-PT", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: precision,
        }).format(value);
      case "percentage":
        return `${value.toFixed(precision)}%`;
      case "days":
        return `${value} dias`;
      case "hours":
        return `${value}h`;
      default:
        return value.toFixed(precision);
    }
  }

  private createErrorMetric(metricId: string, message: string): ComputedMetric {
    return {
      metricId,
      value: 0,
      formattedValue: "N/A",
      confidence: 0,
      computedAt: new Date().toISOString(),
      dataCompleteness: 0,
      warnings: [{ type: "incomplete_data", message, severity: "critical" }],
    };
  }

  // ============================================
  // BATCH COMPUTATION
  // ============================================

  public computeAllMetrics(): Map<string, ComputedMetric> {
    const results = new Map<string, ComputedMetric>();
    Object.keys(METRICS_CATALOG).forEach((metricId) => {
      results.set(metricId, this.computeMetric(metricId));
    });
    return results;
  }

  public computeMetricsForModule(moduleName: string): Map<string, ComputedMetric> {
    const results = new Map<string, ComputedMetric>();
    Object.entries(METRICS_CATALOG)
      .filter(([_, def]) => def.contexts.some((c) => c.module === moduleName))
      .forEach(([metricId]) => {
        results.set(metricId, this.computeMetric(metricId));
      });
    return results;
  }

  // ============================================
  // FORECAST ENGINE
  // ============================================

  public computeForecast(): ForecastResult[] {
    const periods = [30, 60, 90];
    const results: ForecastResult[] = [];

    const historicalCloseRate = this.calculateCloseRate() / 100;
    const hasHistory = (this.data.opportunities?.filter((o) => o.status === "won").length || 0) >= 3;

    periods.forEach((days) => {
      const baseValue = this.calculateForecastValue(days);
      const baseDeals = this.calculateForecastDeals(days);

      const scenarios = {
        conservative: {
          expectedRevenue: Math.round(baseValue * 0.7),
          expectedDeals: Math.round(baseDeals * 0.7),
          probability: 80,
        } as ForecastScenarioData,
        realistic: {
          expectedRevenue: baseValue,
          expectedDeals: baseDeals,
          probability: 60,
        } as ForecastScenarioData,
        optimistic: {
          expectedRevenue: Math.round(baseValue * 1.3),
          expectedDeals: Math.round(baseDeals * 1.3),
          probability: 30,
        } as ForecastScenarioData,
      };

      const factors: ForecastFactor[] = [];

      if (this.countStaleOpportunities() > 3) {
        factors.push({
          name: "Oportunidades paradas",
          impact: "negative",
          weight: -0.1,
          description: "Várias oportunidades sem atividade recente",
        });
      }

      if (historicalCloseRate > 0.4) {
        factors.push({
          name: "Alta taxa de fecho",
          impact: "positive",
          weight: 0.15,
          description: "Histórico de conversão acima da média",
        });
      }

      results.push({
        periodDays: days,
        periodLabel: `${days} dias`,
        scenarios,
        confidence: hasHistory ? 75 : 45,
        factors,
        computedAt: new Date().toISOString(),
        modelVersion: "1.0.0",
      });
    });

    return results;
  }

  private calculateForecastDeals(days: number): number {
    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const avgCloseTime = this.calculateAvgCloseTime();

    const relevantOpps =
      this.data.opportunities?.filter((o) => {
        if (o.status !== "open") return false;
        if (o.expected_close_date) {
          return new Date(o.expected_close_date) <= targetDate;
        }
        const daysOpen = differenceInDays(now, new Date(o.created_at));
        const expectedCloseInDays = Math.max(0, avgCloseTime - daysOpen);
        return expectedCloseInDays <= days;
      }) || [];

    return Math.round(relevantOpps.reduce((sum, o) => sum + (o.probability || 50) / 100, 0));
  }
}
