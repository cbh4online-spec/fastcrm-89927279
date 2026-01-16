export type SuggestionType = 
  | 'schedule_session'
  | 'consumption_alert'
  | 'upsell_opportunity'
  | 'churn_risk'
  | 'reactivation'
  | 'renewal';

export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface AIJourneySuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  reasoning: string;
  suggestedAction: string;
  actionType?: 'schedule' | 'call' | 'email' | 'task' | 'proposal';
  metadata?: {
    productId?: string;
    productName?: string;
    consumedQuantity?: number;
    totalQuantity?: number;
    daysSinceLastInteraction?: number;
    expectedFrequencyDays?: number;
    percentageConsumed?: number;
  };
  createdAt: Date;
}

export const SUGGESTION_TYPE_CONFIG: Record<SuggestionType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  schedule_session: {
    label: 'Agendar Sessão',
    icon: 'Calendar',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  consumption_alert: {
    label: 'Alerta de Consumo',
    icon: 'AlertTriangle',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  upsell_opportunity: {
    label: 'Oportunidade Upsell',
    icon: 'TrendingUp',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  churn_risk: {
    label: 'Risco de Abandono',
    icon: 'AlertCircle',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  reactivation: {
    label: 'Reativação',
    icon: 'RefreshCw',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  renewal: {
    label: 'Renovação',
    icon: 'Repeat',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
};

export const PRIORITY_CONFIG: Record<SuggestionPriority, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  high: {
    label: 'Alta',
    color: 'text-red-700',
    bgColor: 'bg-red-100'
  },
  medium: {
    label: 'Média',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100'
  },
  low: {
    label: 'Baixa',
    color: 'text-green-700',
    bgColor: 'bg-green-100'
  }
};
