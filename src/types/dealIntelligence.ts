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

export interface DealIntelligencePayload {
  deal_id: string;
  health_score: number;
  health_label: APIHealthLabel;
  risk_drivers: APIRiskDriver[];
  next_best_action: APINextBestAction;
  data_completeness: APIDataCompleteness;
  debug: APIDebug;
}

export interface CompactDealIntelligence {
  health_score: number;
  health_label: APIHealthLabel;
  top_reason: string | null;
}

export interface BulkDealIntelligenceResponse {
  items: Record<string, CompactDealIntelligence>;
}
