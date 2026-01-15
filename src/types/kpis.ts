// KPIs & Forecasting Types

export type IndustryType = 
  | "general" 
  | "education" 
  | "health" 
  | "services" 
  | "real_estate"
  | "marketing"
  | "consulting"
  | "ecommerce";

export type TrendDirection = "up" | "down" | "stable";

// Core KPIs (always calculated)
export interface CoreLeadKPIs {
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  leadToOpportunityRate: number;
  avgResponseTimeHours: number;
  leadsTrend: TrendDirection;
}

export interface CoreOpportunityKPIs {
  activeOpportunities: number;
  totalPipelineValue: number;
  weightedValue: number;
  closeRate: number;
  avgCloseTimeDays: number;
  opportunitiesTrend: TrendDirection;
}

export interface CoreEfficiencyKPIs {
  staleOpportunities: number;
  overdueFollowups: number;
  activeAutomations: number;
  manualVsAutomatedRatio: number;
  timeSavedHours: number;
}

export interface CoreKPIs {
  leads: CoreLeadKPIs;
  opportunities: CoreOpportunityKPIs;
  efficiency: CoreEfficiencyKPIs;
}

// Industry-specific KPIs
export interface EducationKPIs {
  enrollmentsConfirmed: number;
  visitToEnrollmentRate: number;
  valuePerStudent: number;
  avgTimeToEnrollmentDays: number;
  pendingDocuments: number;
}

export interface HealthKPIs {
  appointmentsScheduled: number;
  requestToAppointmentRate: number;
  noShowRate: number;
  avgTimeToFirstAppointmentDays: number;
  treatmentsInProgress: number;
}

export interface ServicesKPIs {
  proposalsSent: number;
  proposalWinRate: number;
  avgTicket: number;
  activeRecurringRevenue: number;
  projectsInProgress: number;
}

export interface RealEstateKPIs {
  visitsScheduled: number;
  visitToReservationRate: number;
  avgPropertyValue: number;
  propertiesInNegotiation: number;
  avgTimeToCloseDays: number;
}

export type IndustrySpecificKPIs = 
  | EducationKPIs 
  | HealthKPIs 
  | ServicesKPIs 
  | RealEstateKPIs
  | Record<string, number>;

// Forecasting
export interface ForecastPeriod {
  period: "30d" | "60d" | "90d";
  label: string;
  expectedRevenue: number;
  expectedDeals: number;
  confidence: number;
}

export interface Forecast {
  periods: ForecastPeriod[];
  basedOnHistory: boolean;
  lastUpdated: string;
  explanation: string;
}

// Pipeline Analysis
export interface PipelineBottleneck {
  stageId: string;
  stageName: string;
  stageColor: string;
  count: number;
  avgDaysInStage: number;
  isBottleneck: boolean;
  suggestion?: string;
}

export interface PipelineAnalysis {
  stages: PipelineBottleneck[];
  totalInPipeline: number;
  totalValue: number;
  mostCongestedStage: string | null;
  healthScore: number; // 0-100
}

// AI Insights
export interface KPIInsight {
  id: string;
  type: "warning" | "opportunity" | "info" | "success";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  metric?: string;
  change?: string;
  suggestion?: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface AIKPIAnalysis {
  summary: string;
  insights: KPIInsight[];
  recommendations: string[];
  riskAlerts: string[];
}

// KPI Card Configuration
export interface KPICardConfig {
  id: string;
  label: string;
  value: number | string;
  format?: "number" | "currency" | "percentage" | "time" | "days";
  trend?: TrendDirection;
  trendValue?: string;
  icon?: string;
  description?: string;
  visible: boolean;
  pinned: boolean;
  industry?: IndustryType[];
}

// User Preferences
export interface KPIPreferences {
  hiddenKPIs: string[];
  pinnedKPIs: string[];
  defaultPeriod: "today" | "week" | "month" | "quarter";
  showComparisons: boolean;
  comparisonPeriod: "previous" | "same_last_year";
}

// Complete KPIs State
export interface KPIsState {
  core: CoreKPIs;
  industry?: IndustrySpecificKPIs;
  industryType: IndustryType;
  forecast: Forecast;
  pipelineAnalysis: PipelineAnalysis;
  aiAnalysis?: AIKPIAnalysis;
  preferences: KPIPreferences;
  lastUpdated: string;
  isLoading: boolean;
}

// Comparison Data
export interface KPIComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
}

export interface KPIPeriodComparison {
  period: string;
  leads: KPIComparison;
  opportunities: KPIComparison;
  revenue: KPIComparison;
  closeRate: KPIComparison;
}
