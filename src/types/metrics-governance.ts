// ============================================
// METRICS GOVERNANCE - SINGLE SOURCE OF TRUTH
// ============================================

export type MetricCategory = 
  | "leads"
  | "opportunities"
  | "revenue"
  | "efficiency"
  | "performance"
  | "commissions"
  | "affiliates";

export type MetricScope = 
  | "global"
  | "workspace"
  | "user"
  | "pipeline"
  | "period";

export type UpdateFrequency = 
  | "realtime"
  | "hourly"
  | "daily"
  | "weekly";

export type PermissionLevel = 
  | "user"
  | "manager"
  | "financial"
  | "admin";

export type ForecastScenario = "conservative" | "realistic" | "optimistic";

// ============================================
// METRIC DEFINITION (CATALOG ENTRY)
// ============================================

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  formula: string; // Technical formula
  humanFormula: string; // Human-readable explanation
  dataSource: string[];
  updateFrequency: UpdateFrequency;
  contexts: MetricContext[];
  unit: "number" | "currency" | "percentage" | "time" | "days" | "hours";
  precision: number;
  higherIsBetter?: boolean;
  thresholds?: MetricThreshold;
  requiredPermission: PermissionLevel;
  version: string;
  lastModified: string;
  industryRelevance?: string[];
}

export interface MetricContext {
  module: string;
  displayLevel: "summary" | "detailed" | "full";
  showTrend: boolean;
  showComparison: boolean;
}

export interface MetricThreshold {
  warning?: number;
  critical?: number;
  excellent?: number;
}

// ============================================
// COMPUTED METRIC VALUE
// ============================================

export interface ComputedMetric {
  metricId: string;
  value: number;
  formattedValue: string;
  trend?: TrendInfo;
  comparison?: ComparisonInfo;
  confidence: number;
  computedAt: string;
  dataCompleteness: number; // 0-100%
  warnings?: MetricWarning[];
}

export interface TrendInfo {
  direction: "up" | "down" | "stable";
  changePercent: number;
  period: string;
}

export interface ComparisonInfo {
  previousValue: number;
  change: number;
  changePercent: number;
  comparisonPeriod: string;
}

export interface MetricWarning {
  type: "incomplete_data" | "low_confidence" | "stale_data" | "anomaly";
  message: string;
  severity: "info" | "warning" | "critical";
}

// ============================================
// FORECAST GOVERNANCE
// ============================================

export interface ForecastResult {
  periodDays: number;
  periodLabel: string;
  scenarios: {
    conservative: ForecastScenarioData;
    realistic: ForecastScenarioData;
    optimistic: ForecastScenarioData;
  };
  confidence: number;
  factors: ForecastFactor[];
  computedAt: string;
  modelVersion: string;
}

export interface ForecastScenarioData {
  expectedRevenue: number;
  expectedDeals: number;
  probability: number;
}

export interface ForecastFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  description: string;
}

// ============================================
// PERMISSION & AUDIT
// ============================================

export interface MetricPermission {
  metricId: string;
  role: PermissionLevel;
  canView: boolean;
  canExport: boolean;
  canModifyDefinition: boolean;
}

export interface MetricAuditLog {
  id: string;
  metricId: string;
  action: "definition_changed" | "threshold_updated" | "access_granted" | "access_revoked";
  performedBy: string;
  performedAt: string;
  previousValue?: unknown;
  newValue?: unknown;
  impactedModules: string[];
}

// ============================================
// CONSISTENCY CHECK
// ============================================

export interface ConsistencyCheck {
  status: "valid" | "warning" | "error";
  checks: ConsistencyCheckItem[];
  lastChecked: string;
}

export interface ConsistencyCheckItem {
  checkName: string;
  passed: boolean;
  message: string;
  affectedMetrics?: string[];
}

// ============================================
// METRICS SERVICE INTERFACE
// ============================================

export interface MetricsServiceConfig {
  enableCaching: boolean;
  cacheTTLSeconds: number;
  enableRealtime: boolean;
  enableAuditLog: boolean;
}

export interface MetricsSnapshot {
  snapshotId: string;
  workspaceId: string;
  computedAt: string;
  metrics: Record<string, ComputedMetric>;
  forecasts: ForecastResult[];
  consistency: ConsistencyCheck;
  aiExplanations?: Record<string, string>;
}

// ============================================
// AI GOVERNANCE
// ============================================

export interface AIMetricExplanation {
  metricId: string;
  explanation: string;
  factors: string[];
  suggestion?: string;
  sourceMetrics: string[];
  confidence: number;
  generatedAt: string;
}

export interface AIGovernanceRules {
  canExplainMetrics: boolean;
  canHighlightRisks: boolean;
  canSuggestActions: boolean;
  canCompareScenarios: boolean;
  canNotAlterValues: true; // Always true - AI never changes data
  canNotCreateUnauditedMetrics: true; // Always true
  mustReferenceSource: true; // Always true
}
