// AI Insights Module Types

export type InsightCategory = 'priority' | 'risk' | 'opportunity' | 'efficiency';
export type InsightConfidence = 'high' | 'medium' | 'low';
export type EntityTemperature = 'cold' | 'warm' | 'hot' | 'critical';

export interface AIInsight {
  id: string;
  category: InsightCategory;
  title: string;
  reason: string;
  confidence: InsightConfidence;
  action: InsightAction;
  createdAt: string;
  dismissed?: boolean;
  feedback?: 'useful' | 'not_useful';
}

export interface InsightAction {
  type: InsightActionType;
  label: string;
  data?: Record<string, unknown>;
}

export type InsightActionType = 
  | 'reply_now'
  | 'create_task'
  | 'convert_opportunity'
  | 'apply_template'
  | 'schedule_followup'
  | 'create_automation'
  | 'dismiss'
  | 'convert_contact'
  | 'send_proposal'
  | 'mark_priority'
  | 'archive';

export interface EntityScore {
  value: number; // 0-100
  temperature: EntityTemperature;
  factors: ScoreFactor[];
  lastUpdated: string;
}

export interface ScoreFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface InsightsAnalysisResult {
  score: EntityScore;
  insights: AIInsight[];
  summary: string;
  predictedActions: string[];
  analysisTimestamp: string;
}

export interface InsightsSettings {
  proactivityLevel: 'low' | 'medium' | 'high';
  enabledCategories: InsightCategory[];
  autoRefresh: boolean;
  refreshInterval: number; // minutes
}

export interface InsightsHistoryEntry {
  id: string;
  entityId: string;
  entityType: 'lead' | 'contact' | 'company';
  insight: AIInsight;
  actionTaken: boolean;
  actionResult?: 'success' | 'ignored';
  createdAt: string;
}

// Category display config
export const INSIGHT_CATEGORY_CONFIG: Record<InsightCategory, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  priority: {
    label: 'Prioridade',
    icon: 'AlertCircle',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  risk: {
    label: 'Risco',
    icon: 'AlertTriangle',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  opportunity: {
    label: 'Oportunidade',
    icon: 'TrendingUp',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  efficiency: {
    label: 'Eficiência',
    icon: 'Zap',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

export const TEMPERATURE_CONFIG: Record<EntityTemperature, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}> = {
  cold: {
    label: 'Frio',
    emoji: '❄️',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  warm: {
    label: 'Morno',
    emoji: '🌤️',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  hot: {
    label: 'Quente',
    emoji: '🔥',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  critical: {
    label: 'Crítico',
    emoji: '🚨',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

export const CONFIDENCE_CONFIG: Record<InsightConfidence, {
  label: string;
  color: string;
}> = {
  high: {
    label: 'Alta',
    color: 'text-green-600 dark:text-green-400',
  },
  medium: {
    label: 'Média',
    color: 'text-amber-600 dark:text-amber-400',
  },
  low: {
    label: 'Baixa',
    color: 'text-muted-foreground',
  },
};
