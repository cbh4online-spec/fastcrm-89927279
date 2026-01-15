// ============================================
// METRICS GOVERNANCE - MAIN EXPORT
// ============================================

// Types
export * from "@/types/metrics-governance";

// Catalog
export {
  METRICS_CATALOG,
  getMetricsByCategory,
  getMetricsForModule,
  getMetricDefinition,
  getMetricDisplayConfig,
} from "./MetricsCatalog";

// Services
export { MetricsCalculationService } from "./MetricsCalculationService";
export { ConsistencyService } from "./ConsistencyService";
export { PermissionsService, permissionsService } from "./PermissionsService";
