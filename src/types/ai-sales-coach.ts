export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type HealthTrend = 'improving' | 'stable' | 'declining';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DealSentiment = 'positive' | 'neutral' | 'negative' | 'unknown';

export interface RiskSignal {
  type: string;
  severity: RiskSeverity;
  description: string;
}

export interface NextAction {
  priority: number;
  action: string;
  rationale: string;
  due_days: number;
}

export interface DealIntelligenceReport {
  id: string;
  workspace_id: string;
  opportunity_id: string;
  win_probability: number;
  win_probability_delta?: number | null;
  confidence_level: ConfidenceLevel;
  health_score: number;
  health_trend: HealthTrend;
  risk_signals: RiskSignal[];
  next_actions: NextAction[];
  coaching_summary?: string | null;
  key_strengths?: string[] | null;
  key_weaknesses?: string[] | null;
  competitive_intel?: string | null;
  stakeholder_analysis?: string | null;
  sentiment: DealSentiment;
  sentiment_reasoning?: string | null;
  days_since_activity?: number | null;
  stall_risk: boolean;
  tokens_used?: number | null;
  generated_at: string;
  expires_at: string;
  is_stale: boolean;
}

export interface DealRiskItem {
  opportunity_id: string;
  opportunity_name: string;
  stage: string;
  value: number;
  risk_type: string;
  severity: RiskSeverity;
  description: string;
  recommended_action: string;
  days_stalled?: number;
}

export interface PipelineRiskReport {
  id: string;
  workspace_id: string;
  pipeline_id?: string | null;
  pipeline_health_score: number;
  at_risk_count: number;
  at_risk_value: number;
  critical_count: number;
  risk_breakdown: Record<string, number>;
  deal_risks: DealRiskItem[];
  avg_deal_age_days?: number | null;
  avg_days_per_stage: Record<string, number>;
  conversion_rates: Record<string, number>;
  executive_summary?: string | null;
  top_3_priorities?: string[] | null;
  tokens_used?: number | null;
  generated_at: string;
  expires_at: string;
  is_stale: boolean;
}

export interface PipelineComparison {
  pipeline_id: string;
  name: string;
  deal_count: number;
  total_value: number;
  win_rate: number;
  avg_cycle_days: number;
  health_score: number;
  top_stage_bottleneck?: string;
}

export interface RepPerformance {
  user_id: string;
  name: string;
  deal_count: number;
  total_value: number;
  win_rate: number;
  avg_cycle_days: number;
}

export interface BottleneckStage {
  pipeline_id: string;
  stage_name: string;
  avg_days_stuck: number;
  drop_rate: number;
  deal_count: number;
}

export interface MultiPipelineIntelReport {
  id: string;
  workspace_id: string;
  pipeline_comparison: PipelineComparison[];
  winning_patterns?: string[] | null;
  losing_patterns?: string[] | null;
  best_source?: string | null;
  best_stage_velocity: Record<string, unknown>;
  rep_performance: RepPerformance[];
  bottleneck_stages: BottleneckStage[];
  strategic_insights?: string[] | null;
  growth_opportunities?: string[] | null;
  forecast_accuracy?: number | null;
  tokens_used?: number | null;
  generated_at: string;
  expires_at: string;
  is_stale: boolean;
}

export interface SalesCoachOverview {
  pipeline_health_score: number;
  total_at_risk_value: number;
  critical_deals_count: number;
  stalled_deals_count: number;
  top_priority_action: string;
  win_rate_trend: 'up' | 'down' | 'stable';
  deals_analyzed: number;
  last_analysis: string;
}
