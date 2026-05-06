import { supabase } from "@/integrations/supabase/client";

export type UsageType =
  | "whatsapp_message" | "whatsapp_template" | "whatsapp_media" | "whatsapp_audio"
  | "ai_transcription" | "ai_conversation_analysis" | "ai_reply_generation"
  | "ai_quality_review" | "ai_coaching"
  | "automation_run" | "webhook_event" | "storage_media"
  | "appointment_reminder" | "support_ticket_ai_triage"
  | "future_voice_call" | "future_call_recording" | "future_video_call";

export type SourceModule = "whatsapp" | "ai" | "automation" | "support" | "appointment" | "storage" | "voice" | "system";

export interface RecordUsageInput {
  workspaceId: string;
  sourceModule: SourceModule;
  usageType: UsageType;
  quantity?: number;
  unit?: "event" | "message" | "token" | "second" | "minute" | "mb" | "gb" | "request" | "run";
  providerName?: string;
  providerInstanceId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason: string | null;
  current_usage: number;
  limit: number | null;
  percentage: number;
  warning: boolean;
  blocked: boolean;
  period?: string;
}

/**
 * Verifica limite + regista evento de consumo. Não lança — falha-segura.
 */
export async function recordUsageEvent(input: RecordUsageInput): Promise<{
  recorded: boolean; blocked: boolean; check?: UsageCheckResult; eventId?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("cost-guard-record", {
      body: {
        workspace_id: input.workspaceId,
        source_module: input.sourceModule,
        usage_type: input.usageType,
        quantity: input.quantity ?? 1,
        unit: input.unit ?? "event",
        provider_name: input.providerName,
        provider_instance_id: input.providerInstanceId,
        user_id: input.userId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        country: input.country,
        metadata: input.metadata ?? {},
      },
    });
    if (error) throw error;
    return {
      recorded: !!data?.recorded,
      blocked: !!data?.blocked,
      check: data?.check,
      eventId: data?.event_id,
    };
  } catch (e) {
    console.error("[recordUsageEvent]", e);
    return { recorded: false, blocked: false };
  }
}

/**
 * Apenas verifica limite, sem registar.
 */
export async function checkUsageLimit(workspaceId: string, usageType: UsageType, quantity = 1): Promise<UsageCheckResult> {
  try {
    const { data, error } = await supabase.rpc("cost_guard_check_limit", {
      p_workspace_id: workspaceId, p_usage_type: usageType, p_quantity: quantity,
    });
    if (error) throw error;
    return data as unknown as UsageCheckResult;
  } catch (e) {
    console.error("[checkUsageLimit]", e);
    return { allowed: true, reason: null, current_usage: 0, limit: null, percentage: 0, warning: false, blocked: false };
  }
}
