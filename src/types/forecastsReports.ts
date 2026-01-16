// Types for Forecasts & Reports Module

// Revenue Types
export type RevenueType = 'realized' | 'forecast' | 'guaranteed' | 'probable';

export interface RevenueMetrics {
  realizedMTD: number;
  realizedYTD: number;
  forecast30d: number;
  forecast60d: number;
  forecast90d: number;
  guaranteedRevenue: number;
  probableRevenue: number;
  variance: number; // difference between forecast and actual
}

// Churn Types
export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ChurnMetrics {
  churnRate: number; // percentage
  atRiskClients: number;
  churned30d: number;
  churned90d: number;
  retentionRate: number;
  avgLifetimeValue: number;
}

export interface ChurnCause {
  cause: string;
  percentage: number;
  affectedClients: number;
  suggestion: string;
}

// Consumption Types
export interface ConsumptionForecast {
  period: string;
  expectedSessions: number;
  expectedUnits: number;
  capacityNeeded: number;
  capacityAvailable: number;
  utilizationRate: number;
}

export interface ProductConsumption {
  productId: string;
  productName: string;
  totalPurchased: number;
  totalConsumed: number;
  consumptionRate: number;
  avgConsumptionPerClient: number;
  forecastCompletion: string; // date
}

// Cohort Types
export interface CohortData {
  cohortMonth: string;
  totalClients: number;
  completionRate: number;
  avgConsumptionTime: number;
  repurchaseRate: number;
  revenuePerClient: number;
}

// Executive KPIs
export interface ExecutiveKPIs {
  realizedRevenueMTD: number;
  realizedRevenueYTD: number;
  forecastedRevenue30d: number;
  forecastedRevenue60d: number;
  forecastedRevenue90d: number;
  activeProducts: number;
  clientsInConsumption: number;
  clientsAtRisk: number;
  upsellPotential: number;
  churnRate: number;
  retentionRate: number;
}

// AI Insights for Reports
export interface ReportAIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'info' | 'success';
  title: string;
  description: string;
  explanation: string; // AI reasoning
  impact?: number; // monetary impact
  suggestion?: string;
  affectedClients?: number;
}

// Filter Types
export interface ReportFilters {
  productType?: string;
  owner?: string;
  industry?: string;
  journeyStage?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Report Alert Types
export type AlertType = 'revenue_below_target' | 'capacity_exceeded' | 'churn_above_normal' | 'upsell_opportunity';

export interface ReportAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  createdAt: string;
  dismissed: boolean;
  actions?: {
    createTask: boolean;
    triggerAutomation: boolean;
  };
}

// Scenario Analysis
export interface ScenarioAnalysis {
  scenario: string;
  description: string;
  probability: number;
  revenueImpact: number;
  clientsAffected: number;
}

// Constants
export const CHURN_RISK_CONFIG: Record<ChurnRisk, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Baixo', color: 'text-green-600', bgColor: 'bg-green-50' },
  medium: { label: 'Médio', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  high: { label: 'Alto', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  critical: { label: 'Crítico', color: 'text-red-600', bgColor: 'bg-red-50' },
};

export const JOURNEY_STAGES_PT = {
  new: 'Novo',
  onboarding: 'Em onboarding',
  active: 'Em consumo',
  paused: 'Em pausa',
  completed: 'Concluído',
  upsell_ready: 'Pronto para upsell',
  at_risk: 'Em risco',
};
