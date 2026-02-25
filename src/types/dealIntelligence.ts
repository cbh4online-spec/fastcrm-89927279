export type APIHealthLabel = "HEALTHY" | "WATCH" | "AT_RISK";
export type APIRiskSeverity = "HIGH" | "MEDIUM" | "LOW";
export type APINBAType = "FOLLOW_UP" | "CREATE_TASK" | "REVIEW_BLOCKERS" | "COMPLETE_DATA" | "SEND_RECAP";

export interface APIRiskDriver {
  reason: string;
  severity: APIRiskSeverity;
}

export interface APINBAPayload {
  suggested_due_days: number;
  suggested_title: string;
  suggested_priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface APINextBestAction {
  title: string;
  type: APINBAType;
  payload: APINBAPayload;
}

export interface APIDataCompleteness {
  percent: number;
  missing_fields: string[];
}

export interface APIDebug {
  last_activity_days: number | null;
  has_next_step: boolean;
  stage_days: number;
}

export interface APIBenchmarks {
  expected_stage_days: number;
  avg_stage_days: number | null;
  deal_stage_days: number;
}

export interface APIHistoricalInsight {
  text: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface APIAutomationSuggestion {
  title: string;
  template_id: string;
  reason: string;
}

export interface DealIntelligencePayload {
  deal_id: string;
  health_score: number;
  health_label: APIHealthLabel;
  risk_drivers: APIRiskDriver[];
  next_best_action: APINextBestAction;
  data_completeness: APIDataCompleteness;
  confidence: number;
  debug: APIDebug;
  benchmarks?: APIBenchmarks;
  historical_insights?: APIHistoricalInsight[];
  automation_suggestions?: APIAutomationSuggestion[];
  label_changed?: boolean;
  previous_label?: string | null;
}

export interface CompactDealIntelligence {
  health_score: number;
  health_label: APIHealthLabel;
  top_reason: string | null;
  confidence?: number;
  stage_days?: number | null;
  last_activity_days?: number | null;
}

export interface BulkDealIntelligenceResponse {
  items: Record<string, CompactDealIntelligence>;
}
