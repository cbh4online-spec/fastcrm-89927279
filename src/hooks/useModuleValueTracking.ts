import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ValueMetric {
  type: "time_saved" | "leads_generated" | "emails_sent" | "actions_completed" | "revenue_influenced";
  value: number;
  unit?: string;
}

interface TrackValueParams {
  moduleId: string;
  actionKey: string;
  metrics: ValueMetric[];
  metadata?: Record<string, unknown>;
}

// Estimated time savings per action type (in minutes)
const ACTION_TIME_SAVINGS: Record<string, number> = {
  // AI actions
  "ai_analysis": 15,
  "ai_suggestion": 5,
  "ai_coaching": 20,
  "ai_enrichment": 10,
  
  // Automation actions
  "automation_triggered": 5,
  "email_sent": 2,
  "sms_sent": 1,
  "whatsapp_sent": 1,
  
  // Prospecting actions
  "lead_found": 8,
  "lead_enriched": 5,
  "company_searched": 3,
  
  // Default
  "default": 3,
};

export function useModuleValueTracking() {
  const { currentWorkspace } = useWorkspace();

  const trackValue = useCallback(async ({
    moduleId,
    actionKey,
    metrics,
    metadata = {},
  }: TrackValueParams) => {
    if (!currentWorkspace?.id) return;

    try {
      // Get current value_generated
      const { data: currentData } = await supabase
        .from("workspace_modules")
        .select("value_generated")
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", moduleId)
        .single();

      const currentValue = (currentData?.value_generated as Record<string, number>) || {};

      // Calculate new values
      const updatedValue = { ...currentValue };
      
      for (const metric of metrics) {
        const key = metric.type;
        updatedValue[key] = (updatedValue[key] || 0) + metric.value;
      }

      // Add automatic time estimation if not explicitly provided
      const hasTimeSaved = metrics.some(m => m.type === "time_saved");
      if (!hasTimeSaved) {
        const estimatedMinutes = ACTION_TIME_SAVINGS[actionKey] || ACTION_TIME_SAVINGS.default;
        updatedValue.time_saved_minutes = (updatedValue.time_saved_minutes || 0) + estimatedMinutes;
        updatedValue.time_saved_hours = Math.round((updatedValue.time_saved_minutes / 60) * 10) / 10;
      }

      // Increment actions completed
      updatedValue.actions_completed = (updatedValue.actions_completed || 0) + 1;

      // Update in database
      await supabase
        .from("workspace_modules")
        .update({ 
          value_generated: updatedValue,
        })
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", moduleId);

    } catch (err) {
      console.error("Error tracking value:", err);
    }
  }, [currentWorkspace?.id]);

  const getValueSummary = useCallback(async (moduleId: string) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data } = await supabase
        .from("workspace_modules")
        .select("value_generated")
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", moduleId)
        .single();

      return data?.value_generated as Record<string, number> | null;
    } catch (err) {
      console.error("Error getting value summary:", err);
      return null;
    }
  }, [currentWorkspace?.id]);

  const formatValueMessage = useCallback((value: Record<string, number> | null): string | null => {
    if (!value) return null;

    const parts: string[] = [];

    if (value.time_saved_hours && value.time_saved_hours >= 0.5) {
      parts.push(`~${value.time_saved_hours}h poupadas`);
    }

    if (value.leads_generated && value.leads_generated > 0) {
      parts.push(`${value.leads_generated} leads gerados`);
    }

    if (value.emails_sent && value.emails_sent > 0) {
      parts.push(`${value.emails_sent} emails enviados`);
    }

    if (value.actions_completed && value.actions_completed > 0 && parts.length === 0) {
      parts.push(`${value.actions_completed} ações realizadas`);
    }

    return parts.length > 0 ? parts.join(" • ") : null;
  }, []);

  return {
    trackValue,
    getValueSummary,
    formatValueMessage,
  };
}
