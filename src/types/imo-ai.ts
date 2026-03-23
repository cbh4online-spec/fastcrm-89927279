export type SignalType = 'trend_up' | 'trend_down' | 'seasonal' | 'anomaly' | 'opportunity'
export type SignalStrength = 'weak' | 'moderate' | 'strong'
export type EntryDifficulty = 'easy' | 'medium' | 'hard'
export type GrowthCategory = 'acquisition' | 'retention' | 'expansion' | 'reactivation' | 'product' | 'channel'
export type ImpactLevel = 'low' | 'medium' | 'high' | 'very_high'
export type EffortLevel = 'low' | 'medium' | 'high'
export type ChannelPerformance = 'underperforming' | 'average' | 'strong'
export type GrowthPotential = 'low' | 'medium' | 'high'

export interface MarketSignal {
  signal_type: SignalType
  title: string
  description: string
  evidence: string
  strength: SignalStrength
  sector?: string
  confidence: number
}

export interface CompetitiveSignal {
  signal: string
  implication: string
  recommended_action: string
}

export interface UntappedSegment {
  segment: string
  estimated_size: string
  entry_difficulty: EntryDifficulty
  rationale: string
}

export interface IMOMarketInsight {
  id: string
  workspace_id: string
  period_start: string
  period_end: string
  dominant_sectors: string[]
  sector_distribution: Record<string, number>
  market_signals: MarketSignal[]
  competitive_signals: CompetitiveSignal[]
  demand_calendar: Record<string, number>
  peak_months: string[]
  low_months: string[]
  untapped_segments: UntappedSegment[]
  market_summary?: string
  key_findings?: string[]
  tokens_used?: number
  generated_at: string
  expires_at: string
  is_stale: boolean
}

export interface GrowthOpportunity {
  rank: number
  title: string
  category: GrowthCategory
  description: string
  expected_impact: ImpactLevel
  effort_required: EffortLevel
  time_to_impact_days: number
  evidence: string
  specific_actions: string[]
  target_segment?: string
}

export interface ChannelAnalysis {
  channel: string
  deal_count: number
  conversion_rate: number
  avg_deal_value: number
  performance: ChannelPerformance
  recommendation: string
}

export interface SegmentAnalysis {
  segment: string
  current_penetration: number
  win_rate: number
  avg_deal_value: number
  growth_potential: GrowthPotential
  recommendation: string
}

export interface ReactivationTarget {
  contact_id: string
  contact_name: string
  last_interaction_days: number
  reactivation_reason: string
}

export interface QuickWin {
  action: string
  expected_result: string
  effort_hours: number
}

export interface RoadmapItem {
  week_range: '1-2' | '3-4' | '5-8' | '9-12'
  focus: string
  actions: string[]
  kpi: string
}

export interface IMOGrowthInsight {
  id: string
  workspace_id: string
  opportunities: GrowthOpportunity[]
  channel_analysis: ChannelAnalysis[]
  segment_analysis: SegmentAnalysis[]
  reactivation_targets: ReactivationTarget[]
  quick_wins: QuickWin[]
  roadmap_90d: RoadmapItem[]
  growth_score: number
  growth_score_delta?: number
  growth_summary?: string
  top_priority?: string
  tokens_used?: number
  generated_at: string
  expires_at: string
  is_stale: boolean
}
