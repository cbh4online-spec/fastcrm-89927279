// ============================================
// useMetricsGovernance - Central Metrics Hook
// ============================================
// Single hook for consuming governed metrics across all modules.
// Ensures consistency and single source of truth.

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLeads } from "./useLeads";
import { useOpportunitiesEnhanced, usePipelineStagesEnhanced } from "./useOpportunitiesEnhanced";
import { useConversations } from "./useConversations";
import { useAutomationRules } from "./useAutomations";
import { useProposals } from "./useProposals";
import { useTasks } from "./useTasks";
import {
  MetricsCalculationService,
  ConsistencyService,
  PermissionsService,
  getMetricsForModule,
  getMetricDefinition,
  METRICS_CATALOG,
} from "@/services/metrics";
import {
  ComputedMetric,
  MetricsSnapshot,
  ConsistencyCheck,
  ForecastResult,
  PermissionLevel,
  MetricDefinition,
} from "@/types/metrics-governance";

interface UseMetricsGovernanceOptions {
  module?: string;
  userRole?: PermissionLevel;
  enableConsistencyChecks?: boolean;
}

interface MetricsGovernanceResult {
  // Core metrics
  metrics: Map<string, ComputedMetric>;
  getMetric: (metricId: string) => ComputedMetric | undefined;
  getMetricValue: (metricId: string) => number;
  getMetricFormatted: (metricId: string) => string;
  
  // Forecasts
  forecasts: ForecastResult[];
  
  // Consistency
  consistency: ConsistencyCheck | null;
  warnings: string[];
  
  // Permissions
  canAccessMetric: (metricId: string) => boolean;
  accessibleMetrics: string[];
  
  // Metadata
  isLoading: boolean;
  lastUpdated: string | null;
  dataCompleteness: number;
  
  // Module-specific
  moduleMetrics: ComputedMetric[];
  
  // Snapshot for AI
  getSnapshot: () => MetricsSnapshot | null;
}

export function useMetricsGovernance(
  options: UseMetricsGovernanceOptions = {}
): MetricsGovernanceResult {
  const { module, userRole = "user", enableConsistencyChecks = true } = options;

  // Data sources - single fetch for all
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunitiesEnhanced();
  const { data: stages, isLoading: stagesLoading } = usePipelineStagesEnhanced();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const { data: automations, isLoading: automationsLoading } = useAutomationRules();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: tasks, isLoading: tasksLoading } = useTasks();

  const isLoading =
    leadsLoading ||
    opportunitiesLoading ||
    stagesLoading ||
    conversationsLoading ||
    automationsLoading ||
    proposalsLoading ||
    tasksLoading;

  // Raw data object
  const rawData = useMemo(
    () => ({
      leads: leads || [],
      opportunities: opportunities || [],
      stages: stages || [],
      conversations: conversations || [],
      automations: automations || [],
      proposals: proposals || [],
      tasks: tasks || [],
    }),
    [leads, opportunities, stages, conversations, automations, proposals, tasks]
  );

  // Services
  const calculationService = useMemo(
    () => new MetricsCalculationService(rawData),
    [rawData]
  );

  const consistencyService = useMemo(
    () => new ConsistencyService(rawData),
    [rawData]
  );

  const permissionsService = useMemo(
    () => new PermissionsService(userRole),
    [userRole]
  );

  // Compute all metrics
  const metrics = useMemo(() => {
    if (isLoading) return new Map<string, ComputedMetric>();
    return calculationService.computeAllMetrics();
  }, [calculationService, isLoading]);

  // Compute forecasts
  const forecasts = useMemo(() => {
    if (isLoading) return [];
    return calculationService.computeForecast();
  }, [calculationService, isLoading]);

  // Consistency checks
  const consistency = useMemo(() => {
    if (!enableConsistencyChecks || isLoading) return null;
    return consistencyService.runConsistencyChecks();
  }, [consistencyService, enableConsistencyChecks, isLoading]);

  // Extract warnings as strings
  const warnings = useMemo(() => {
    if (!consistency) return [];
    return consistency.checks
      .filter((c) => !c.passed)
      .map((c) => c.message);
  }, [consistency]);

  // Get accessible metrics
  const accessibleMetrics = useMemo(
    () => permissionsService.getAccessibleMetrics(),
    [permissionsService]
  );

  // Module-specific metrics
  const moduleMetrics = useMemo(() => {
    if (!module) return [];
    const moduleMetricDefs = getMetricsForModule(module);
    return moduleMetricDefs
      .filter((def) => permissionsService.canAccessMetric(def.id))
      .map((def) => metrics.get(def.id))
      .filter(Boolean) as ComputedMetric[];
  }, [module, metrics, permissionsService]);

  // Calculate overall data completeness
  const dataCompleteness = useMemo(() => {
    const values = Array.from(metrics.values());
    if (values.length === 0) return 0;
    return Math.round(
      values.reduce((sum, m) => sum + m.dataCompleteness, 0) / values.length
    );
  }, [metrics]);

  // Helper functions
  const getMetric = useCallback(
    (metricId: string) => metrics.get(metricId),
    [metrics]
  );

  const getMetricValue = useCallback(
    (metricId: string) => metrics.get(metricId)?.value ?? 0,
    [metrics]
  );

  const getMetricFormatted = useCallback(
    (metricId: string) => metrics.get(metricId)?.formattedValue ?? "N/A",
    [metrics]
  );

  const canAccessMetric = useCallback(
    (metricId: string) => permissionsService.canAccessMetric(metricId),
    [permissionsService]
  );

  // Generate snapshot for AI analysis
  const getSnapshot = useCallback((): MetricsSnapshot | null => {
    if (isLoading) return null;

    const metricsRecord: Record<string, ComputedMetric> = {};
    metrics.forEach((value, key) => {
      metricsRecord[key] = value;
    });

    return {
      snapshotId: crypto.randomUUID(),
      workspaceId: "current",
      computedAt: new Date().toISOString(),
      metrics: metricsRecord,
      forecasts,
      consistency: consistency || {
        status: "valid",
        checks: [],
        lastChecked: new Date().toISOString(),
      },
    };
  }, [metrics, forecasts, consistency, isLoading]);

  const lastUpdated = useMemo(() => {
    const firstMetric = metrics.values().next().value;
    return firstMetric?.computedAt || null;
  }, [metrics]);

  return {
    metrics,
    getMetric,
    getMetricValue,
    getMetricFormatted,
    forecasts,
    consistency,
    warnings,
    canAccessMetric,
    accessibleMetrics,
    isLoading,
    lastUpdated,
    dataCompleteness,
    moduleMetrics,
    getSnapshot,
  };
}

// ============================================
// Specialized hooks for specific modules
// ============================================

export function useDashboardMetrics() {
  return useMetricsGovernance({ module: "dashboard" });
}

export function useKPIsMetrics() {
  return useMetricsGovernance({ module: "kpis" });
}

export function useFinancialMetrics(userRole: PermissionLevel = "user") {
  return useMetricsGovernance({ module: "financial", userRole });
}

export function useSellersMetrics(userRole: PermissionLevel = "manager") {
  return useMetricsGovernance({ module: "sellers", userRole });
}

export function useAffiliatesMetrics(userRole: PermissionLevel = "manager") {
  return useMetricsGovernance({ module: "affiliates", userRole });
}
