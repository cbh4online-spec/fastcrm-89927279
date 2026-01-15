// Growth Insights & Lifecycle Module Types

export type RankingCriteria = 
  | 'total_revenue'
  | 'recurring_revenue'
  | 'purchase_frequency'
  | 'margin'
  | 'ltv'
  | 'conversion_rate'
  | 'close_velocity';

export type LifecycleEventType =
  | 'days_after_purchase'
  | 'days_after_completion'
  | 'days_after_last_interaction'
  | 'days_before_renewal';

export type LifecycleActionType =
  | 'create_task'
  | 'send_email'
  | 'send_whatsapp'
  | 'create_opportunity'
  | 'trigger_automation';

export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';

export interface TopCustomer {
  id: string;
  name: string;
  email?: string;
  company?: string;
  totalRevenue: number;
  recurringRevenue: number;
  purchaseCount: number;
  lastPurchaseDate?: string;
  products: ProductPurchase[];
  ltv: number;
  churnRisk: ChurnRisk;
  nextOpportunity?: NextOpportunity;
  insights: CustomerInsight[];
}

export interface ProductPurchase {
  productId: string;
  productName: string;
  purchaseDate: string;
  value: number;
  sequence?: number;
}

export interface NextOpportunity {
  productId: string;
  productName: string;
  confidence: number;
  suggestedDate: string;
  reason: string;
}

export interface CustomerInsight {
  id: string;
  type: 'pattern' | 'opportunity' | 'risk' | 'lifecycle';
  message: string;
  confidence: number;
  actionable: boolean;
  suggestedAction?: string;
}

export interface TopSeller {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  totalRevenue: number;
  forecastedRevenue: number;
  margin: number;
  conversionRate: number;
  closeVelocity: number; // days
  dealsWon: number;
  dealsLost: number;
  topProducts: SellerProduct[];
  targetProgress: number;
  insights: SellerInsight[];
}

export interface SellerProduct {
  productId: string;
  productName: string;
  salesCount: number;
  revenue: number;
}

export interface SellerInsight {
  id: string;
  type: 'strength' | 'improvement' | 'trend' | 'recommendation';
  message: string;
  impact: 'high' | 'medium' | 'low';
}

export interface NeedMatch {
  id: string;
  customerId: string;
  customerName: string;
  currentProduct?: string;
  recommendedProduct: string;
  recommendedProductId: string;
  confidence: number;
  idealWindow: {
    start: string;
    end: string;
  };
  reasoning: string;
  basedOn: 'purchase_sequence' | 'similar_customers' | 'time_interval' | 'lifecycle';
  patternDetails?: string;
}

export interface LifecycleTrigger {
  id: string;
  name: string;
  description?: string;
  eventType: LifecycleEventType;
  eventValue: number; // days/months
  productId?: string;
  action: LifecycleActionType;
  actionConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface LifecycleEvent {
  id: string;
  triggerId: string;
  customerId: string;
  customerName: string;
  productId?: string;
  productName?: string;
  eventDate: string;
  status: 'pending' | 'executed' | 'dismissed';
  actionType: LifecycleActionType;
  suggestion: string;
}

export interface GrowthInsightsSummary {
  topCustomersCount: number;
  topCustomersTotalRevenue: number;
  topSellersCount: number;
  pendingNeedMatches: number;
  upcomingLifecycleEvents: number;
  averageChurnRisk: number;
  insightsGenerated: number;
}

export interface RankingConfig {
  criteria: RankingCriteria[];
  weights: Record<RankingCriteria, number>;
  period: 'month' | 'quarter' | 'year' | 'all';
  limit: number;
}

export interface AIGrowthAnalysis {
  customerId?: string;
  sellerId?: string;
  insights: string[];
  recommendations: string[];
  patterns: string[];
  nextBestActions: string[];
  confidenceLevel: number;
  analysisTimestamp: string;
}

// Pattern tracking for AI learning
export interface InsightFeedback {
  id: string;
  insightType: 'need_match' | 'lifecycle' | 'customer' | 'seller';
  insightId: string;
  accepted: boolean;
  result?: 'converted' | 'ignored' | 'delayed';
  resultDetails?: string;
  feedbackDate: string;
}

export const CHURN_RISK_CONFIG: Record<ChurnRisk, {
  label: string;
  color: string;
  bgColor: string;
  emoji: string;
}> = {
  low: {
    label: 'Baixo',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    emoji: '✅'
  },
  medium: {
    label: 'Médio',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    emoji: '⚠️'
  },
  high: {
    label: 'Alto',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    emoji: '🔶'
  },
  critical: {
    label: 'Crítico',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    emoji: '🚨'
  }
};

export const LIFECYCLE_EVENT_LABELS: Record<LifecycleEventType, string> = {
  days_after_purchase: 'Dias após compra',
  days_after_completion: 'Dias após conclusão',
  days_after_last_interaction: 'Dias após última interação',
  days_before_renewal: 'Dias antes da renovação'
};

export const LIFECYCLE_ACTION_LABELS: Record<LifecycleActionType, string> = {
  create_task: 'Criar tarefa',
  send_email: 'Enviar email',
  send_whatsapp: 'Enviar WhatsApp',
  create_opportunity: 'Criar oportunidade',
  trigger_automation: 'Disparar automação'
};
