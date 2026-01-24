/**
 * Student Journey Automation Engine
 * Executes automation rules based on triggers and conditions
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  SJAutomation,
  SJTriggerType,
  SJActionType,
  SJAutomationCondition,
  SJAutomationAction,
} from "@/types/sjAutomation";
import { addHours, addDays } from "date-fns";

export interface SJTriggerContext {
  profileId: string;
  profileName: string;
  profileEmail?: string;
  profileStage?: string;
  enrollmentId?: string;
  courseName?: string;
  interests?: string[];
  dropoutRisk?: string;
  previousValue?: unknown;
  newValue?: unknown;
  workspaceId: string;
  // Phase 4 additions
  lifecycleStage?: string;
  studentScore?: number;
  totalCoursesCompleted?: number;
  lastCourseCompletedAt?: string;
  activationPotential?: string;
}

export interface SJActionResult {
  type: SJActionType;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Main engine class for executing SJ automations
 */
export class SJAutomationEngine {
  private client: SupabaseClient;
  private workspaceId: string;

  constructor(client: SupabaseClient, workspaceId: string) {
    this.client = client;
    this.workspaceId = workspaceId;
  }

  /**
   * Process a trigger event and execute matching automations
   */
  async processTrigger(
    triggerType: SJTriggerType,
    context: SJTriggerContext
  ): Promise<void> {
    // Fetch active automations for this trigger
    const { data: automations, error } = await this.client
      .from("sj_automations")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("trigger_type", triggerType)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching automations:", error);
      return;
    }

    if (!automations || automations.length === 0) {
      return;
    }

    // Process each matching automation
    for (const automationRow of automations) {
      const automation: SJAutomation = {
        id: automationRow.id,
        name: automationRow.name,
        description: automationRow.description || "",
        triggerType: automationRow.trigger_type as SJTriggerType,
        triggerConfig: automationRow.trigger_config as Record<string, unknown>,
        conditions: automationRow.conditions as SJAutomationCondition[],
        actions: automationRow.actions as SJAutomationAction[],
        isActive: automationRow.is_active,
        isSystem: automationRow.is_system || false,
        createdAt: automationRow.created_at,
        updatedAt: automationRow.updated_at,
        workspaceId: automationRow.workspace_id,
      };

      await this.executeAutomation(automation, context);
    }
  }

  /**
   * Execute a single automation if conditions are met
   */
  private async executeAutomation(
    automation: SJAutomation,
    context: SJTriggerContext
  ): Promise<void> {
    // Check conditions
    const conditionsMet = await this.evaluateConditions(
      automation.conditions,
      context
    );

    if (!conditionsMet) {
      return;
    }

    // Execute actions
    const results: SJActionResult[] = [];

    for (const action of automation.actions) {
      const result = await this.executeAction(action, context);
      results.push(result);
    }

    // Log execution
    await this.logExecution(automation, context, results);
  }

  /**
   * Evaluate all conditions for an automation
   */
  private async evaluateConditions(
    conditions: SJAutomationCondition[],
    context: SJTriggerContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const met = await this.evaluateCondition(condition, context);
      if (!met) return false;
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: SJAutomationCondition,
    context: SJTriggerContext
  ): Promise<boolean> {
    const fieldValue = this.getFieldValue(condition.field, context);

    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "not_equals":
        return fieldValue !== condition.value;
      case "contains":
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return String(fieldValue).includes(String(condition.value));
      case "greater_than":
        return Number(fieldValue) > Number(condition.value);
      case "less_than":
        return Number(fieldValue) < Number(condition.value);
      case "is_empty":
        return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case "is_not_empty":
        return !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      case "days_since":
        // Special handling for date comparisons
        if (!fieldValue) return false;
        const date = new Date(fieldValue as string);
        const daysSince = Math.floor(
          (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSince >= Number(condition.value);
      default:
        return true;
    }
  }

  /**
   * Get field value from context
   */
  private getFieldValue(
    field: string,
    context: SJTriggerContext
  ): unknown {
    const fieldMap: Record<string, unknown> = {
      stage: context.profileStage,
      profile_stage: context.profileStage,
      dropout_risk: context.dropoutRisk,
      enrollment_status: context.newValue,
      interests: context.interests,
      previous_value: context.previousValue,
      new_value: context.newValue,
    };

    return fieldMap[field] ?? null;
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: SJAutomationAction,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    try {
      switch (action.type) {
        case "create_task":
          return await this.executeCreateTask(action.config, context);
        case "update_dropout_risk":
          return await this.executeUpdateDropoutRisk(action.config, context);
        case "create_touchpoint":
          return await this.executeCreateTouchpoint(action.config, context);
        case "schedule_follow_up":
          return await this.executeScheduleFollowUp(action.config, context);
        case "create_ai_suggestion":
          return await this.executeCreateAISuggestion(action.config, context);
        case "update_stage":
          return await this.executeUpdateStage(action.config, context);
        case "add_note":
          return await this.executeAddNote(action.config, context);
        // Phase 4 actions
        case "update_lifecycle_stage":
          return await this.executeUpdateLifecycleStage(action.config, context);
        case "update_activation_potential":
          return await this.executeUpdateActivationPotential(action.config, context);
        case "notify_owner":
          return await this.executeNotifyOwner(action.config, context);
        case "suggest_personalized_message":
          return await this.executeSuggestPersonalizedMessage(action.config, context);
        default:
          return {
            type: action.type,
            success: false,
            error: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error) {
      return {
        type: action.type,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create a task
   */
  private async executeCreateTask(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const title = this.replaceVariables(config.title as string, context);
    const description = this.replaceVariables(
      (config.description as string) || "",
      context
    );
    const dueDays = (config.dueDays as number) || 3;

    const { error } = await this.client.from("sj_tasks").insert({
      workspace_id: this.workspaceId,
      profile_id: context.profileId,
      enrollment_id: context.enrollmentId,
      title,
      description,
      due_date: addDays(new Date(), dueDays).toISOString(),
      priority: (config.priority as string) || "medium",
      status: "pending",
    });

    if (error) throw error;

    return {
      type: "create_task",
      success: true,
      result: { title, dueDays },
    };
  }

  /**
   * Update dropout risk
   */
  private async executeUpdateDropoutRisk(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const newRisk = config.newRisk as string;

    const { error } = await this.client
      .from("sj_profiles")
      .update({ dropout_risk: newRisk })
      .eq("id", context.profileId);

    if (error) throw error;

    return {
      type: "update_dropout_risk",
      success: true,
      result: { newRisk },
    };
  }

  /**
   * Create a touchpoint
   */
  private async executeCreateTouchpoint(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const message = this.replaceVariables(config.message as string, context);

    const { error } = await this.client.from("sj_touchpoints").insert({
      workspace_id: this.workspaceId,
      profile_id: context.profileId,
      enrollment_id: context.enrollmentId,
      touchpoint_type: (config.type as string) || "note",
      outcome: config.outcome as string,
      message_preview: message,
      created_by: "system",
    });

    if (error) throw error;

    return {
      type: "create_touchpoint",
      success: true,
      result: { message },
    };
  }

  /**
   * Schedule a follow-up
   */
  private async executeScheduleFollowUp(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const hoursFromNow = (config.hoursFromNow as number) || 48;
    const reason = this.replaceVariables(
      (config.reason as string) || "",
      context
    );

    const followUpAt = addHours(new Date(), hoursFromNow);

    const { error } = await this.client
      .from("sj_profiles")
      .update({
        next_follow_up_at: followUpAt.toISOString(),
        follow_up_reason: reason,
      })
      .eq("id", context.profileId);

    if (error) throw error;

    return {
      type: "schedule_follow_up",
      success: true,
      result: { followUpAt: followUpAt.toISOString(), reason },
    };
  }

  /**
   * Create an AI suggestion
   */
  private async executeCreateAISuggestion(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const message = this.replaceVariables(config.message as string, context);

    const { error } = await this.client.from("sj_ai_suggestions").insert({
      workspace_id: this.workspaceId,
      profile_id: context.profileId,
      enrollment_id: context.enrollmentId,
      suggestion_type: config.suggestionType as string,
      message,
      priority: (config.priority as string) || "medium",
      status: "pending",
    });

    if (error) throw error;

    return {
      type: "create_ai_suggestion",
      success: true,
      result: { suggestionType: config.suggestionType, message },
    };
  }

  /**
   * Update profile stage
   */
  private async executeUpdateStage(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const newStage = config.newStage as string;
    const onlyIfCurrentStage = config.onlyIfCurrentStage as string | undefined;

    // Check current stage if needed
    if (onlyIfCurrentStage && context.profileStage !== onlyIfCurrentStage) {
      return {
        type: "update_stage",
        success: true,
        result: { skipped: true, reason: "Current stage does not match" },
      };
    }

    const { error } = await this.client
      .from("sj_profiles")
      .update({ stage: newStage })
      .eq("id", context.profileId);

    if (error) throw error;

    return {
      type: "update_stage",
      success: true,
      result: { newStage },
    };
  }

  /**
   * Add a note to the profile
   */
  private async executeAddNote(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const content = this.replaceVariables(config.content as string, context);

    const { error } = await this.client.from("sj_touchpoints").insert({
      workspace_id: this.workspaceId,
      profile_id: context.profileId,
      touchpoint_type: "note",
      message_preview: content,
      created_by: "automation",
    });

    if (error) throw error;

    return {
      type: "add_note",
      success: true,
      result: { content },
    };
  }

  /**
   * Replace template variables in text
   */
  private replaceVariables(text: string, context: SJTriggerContext): string {
    return text
      .replace(/\{\{profile_name\}\}/g, context.profileName || "")
      .replace(/\{\{profile_email\}\}/g, context.profileEmail || "")
      .replace(/\{\{course_name\}\}/g, context.courseName || "")
      .replace(/\{\{interests\}\}/g, (context.interests || []).join(", "))
      .replace(/\{\{dropout_risk\}\}/g, context.dropoutRisk || "")
      .replace(/\{\{student_score\}\}/g, String(context.studentScore || 0))
      .replace(/\{\{total_courses_completed\}\}/g, String(context.totalCoursesCompleted || 0))
      .replace(/\{\{lifecycle_stage\}\}/g, context.lifecycleStage || "");
  }

  /**
   * Log automation execution
   */
  private async logExecution(
    automation: SJAutomation,
    context: SJTriggerContext,
    results: SJActionResult[]
  ): Promise<void> {
    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);

    const status = allSuccess ? "success" : anySuccess ? "partial" : "failed";

    await this.client.from("sj_automation_logs").insert({
      workspace_id: this.workspaceId,
      automation_id: automation.id,
      automation_name: automation.name,
      profile_id: context.profileId,
      enrollment_id: context.enrollmentId,
      trigger_type: automation.triggerType,
      trigger_data: context,
      actions_executed: results,
      status,
      executed_at: new Date().toISOString(),
    });
  }

  // ================================================================
  // PHASE 4: New action implementations
  // ================================================================

  /**
   * Update lifecycle stage
   */
  private async executeUpdateLifecycleStage(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const newStage = config.newStage as string;

    const { error } = await this.client
      .from("sj_profiles")
      .update({ lifecycle_stage: newStage })
      .eq("id", context.profileId);

    if (error) throw error;

    return {
      type: "update_lifecycle_stage",
      success: true,
      result: { newStage },
    };
  }

  /**
   * Update activation potential
   */
  private async executeUpdateActivationPotential(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const newPotential = config.newPotential as string;

    const { error } = await this.client
      .from("sj_profiles")
      .update({ activation_potential: newPotential })
      .eq("id", context.profileId);

    if (error) throw error;

    return {
      type: "update_activation_potential",
      success: true,
      result: { newPotential },
    };
  }

  /**
   * Notify owner (creates a notification/alert)
   */
  private async executeNotifyOwner(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const title = this.replaceVariables(config.title as string, context);
    const message = this.replaceVariables(config.message as string, context);

    // Create an AI suggestion as notification (can be expanded to push notifications)
    const { error } = await this.client.from("sj_ai_suggestions").insert({
      workspace_id: this.workspaceId,
      profile_id: context.profileId,
      suggestion_type: "notification",
      message: `${title}: ${message}`,
      priority: "high",
      status: "pending",
    });

    if (error) throw error;

    return {
      type: "notify_owner",
      success: true,
      result: { title, message },
    };
  }

  /**
   * Suggest personalized message
   */
  private async executeSuggestPersonalizedMessage(
    config: Record<string, unknown>,
    context: SJTriggerContext
  ): Promise<SJActionResult> {
    const messageType = config.messageType as string;
    const channel = config.channel as string;
    const template = config.template as string;

    const { error } = await this.client.from("sj_ai_suggestions").insert({
      workspace_id: this.workspaceId,
      profile_id: context.profileId,
      suggestion_type: "personalized_message",
      message: `Sugestão de mensagem ${messageType} via ${channel}. Template: ${template}`,
      priority: "medium",
      status: "pending",
      metadata: { messageType, channel, template },
    });

    if (error) throw error;

    return {
      type: "suggest_personalized_message",
      success: true,
      result: { messageType, channel, template },
    };
  }
}

/**
 * Factory function to create engine instance
 */
export function createSJAutomationEngine(
  client: SupabaseClient,
  workspaceId: string
): SJAutomationEngine {
  return new SJAutomationEngine(client, workspaceId);
}
