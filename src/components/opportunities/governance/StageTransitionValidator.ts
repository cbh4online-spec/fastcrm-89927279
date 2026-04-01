import { PipelineStageConfig } from "@/hooks/usePipelineStages";
import { Opportunity } from "@/types/opportunity";

export interface StageTransitionValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates whether an opportunity can transition to a new stage or close as won/lost.
 */
export function validateStageTransition(
  opportunity: Opportunity,
  action: "move" | "won" | "lost",
  stageConfig?: PipelineStageConfig
): StageTransitionValidationResult {
  const errors: string[] = [];

  if (action === "lost") {
    if (!opportunity.lost_reason) {
      errors.push("lost_reason_required");
    }
    return { valid: errors.length === 0, errors };
  }

  if (action === "won") {
    if (!opportunity.owner_id) {
      errors.push("owner_required");
    }
    if (!opportunity.value || Number(opportunity.value) <= 0) {
      errors.push("value_required");
    }
    if (!opportunity.contact_id && !opportunity.company_id) {
      errors.push("account_required");
    }
    return { valid: errors.length === 0, errors };
  }

  // move action — check stage config
  if (stageConfig) {
    if (stageConfig.blocked_if?.includes("no_next_step") && !opportunity.next_step) {
      errors.push("next_step_required");
    }
    if (stageConfig.blocked_if?.includes("no_expected_close") && !opportunity.expected_close_date) {
      errors.push("expected_close_required");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Computes how many days a deal has been in its current stage.
 */
export function computeStuckDays(opportunity: Opportunity): number {
  const lastUpdate = opportunity.updated_at || opportunity.created_at;
  if (!lastUpdate) return 0;
  return Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 86400000);
}
