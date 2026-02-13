import { useCallback, useEffect } from 'react';
import { useConsent } from '@/modules/growth-seo/hooks/useConsent';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  safePush,
  isProdEnvironment,
  getDeviceType,
  getEnvironment,
  bucketizeValue,
  bucketizeTime,
  bucketizeScore,
  bucketizeCount,
  bucketizeDays,
} from '@/lib/analyticsHelpers';

const APP_VERSION = '3.0.0';

// ── Internal push wrapper ──

function useSafePush() {
  const { consent } = useConsent();
  const isProd = isProdEnvironment();

  return useCallback(
    (event: string, data: Record<string, unknown>) => {
      safePush(event, data, { consentAnalytics: consent.analytics, isProd });
    },
    [consent.analytics, isProd]
  );
}

// ── Main Hook ──

export function useCRMAnalytics() {
  const push = useSafePush();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { plan } = useSubscription();

  // ── Session Context (once per session) ──
  useEffect(() => {
    if (!currentWorkspace?.id || !user?.id) return;
    if (sessionStorage.getItem('crm_ctx_sent')) return;

    push('crm.session_start', {
      workspace_id: currentWorkspace.id,
      user_id: user.id,
      role: currentWorkspace.role,
      plan,
      env: getEnvironment(),
      app_version: APP_VERSION,
      device_type: getDeviceType(),
      locale: navigator.language,
    });

    sessionStorage.setItem('crm_ctx_sent', '1');
  }, [currentWorkspace?.id, user?.id, currentWorkspace?.role, plan, push]);

  // ════════════════════════════════════════
  //  INBOX 3.0
  // ════════════════════════════════════════

  const trackInboxOpened = useCallback(
    (data: {
      total_conversations: number;
      requires_response_count: number;
      follow_up_count: number;
      active_opportunity_count: number;
      sla_risk_count: number;
    }) => {
      push('inbox.opened', data);
    },
    [push]
  );

  const trackConversationOpened = useCallback(
    (data: {
      priority_score: number;
      sla_risk: boolean;
      pipeline_stage?: string;
      potential_value?: number;
      conversion_probability?: number;
      channel: string;
    }) => {
      push('conversation.opened', {
        priority_score: data.priority_score,
        sla_risk: data.sla_risk,
        pipeline_stage: data.pipeline_stage,
        potential_value_bucket: bucketizeValue(data.potential_value || 0),
        conversion_probability_bucket: bucketizeScore(data.conversion_probability || 0),
        channel: data.channel,
      });
    },
    [push]
  );

  const trackConversationReplied = useCallback(
    (data: {
      response_time_minutes: number;
      ai_used: boolean;
      template_used: boolean;
      follow_up_scheduled: boolean;
    }) => {
      push('conversation.replied', {
        response_time_bucket: bucketizeTime(data.response_time_minutes),
        ai_used: data.ai_used,
        template_used: data.template_used,
        follow_up_scheduled: data.follow_up_scheduled,
      });
    },
    [push]
  );

  const trackConversationConverted = useCallback(
    (data: {
      days_to_convert: number;
      used_ai_in_thread: boolean;
      used_template: boolean;
      priority_score_at_start: number;
    }) => {
      push('conversation.converted', {
        days_to_convert: bucketizeDays(data.days_to_convert),
        used_ai_in_thread: data.used_ai_in_thread,
        used_template: data.used_template,
        priority_score_at_start: data.priority_score_at_start,
      });
    },
    [push]
  );

  // ════════════════════════════════════════
  //  TEMPLATES 2.0
  // ════════════════════════════════════════

  const trackTemplateCreated = useCallback(
    (data: { structure_type: string; channel: string; is_dynamic: boolean }) => {
      push('template.created', data);
    },
    [push]
  );

  const trackTemplateUsed = useCallback(
    (data: {
      structure_type: string;
      dynamic: boolean;
      ai_adapted: boolean;
      pipeline_stage_when_used?: string;
      lead_score?: number;
    }) => {
      push('template.used', {
        structure_type: data.structure_type,
        dynamic: data.dynamic,
        ai_adapted: data.ai_adapted,
        pipeline_stage_when_used: data.pipeline_stage_when_used,
        lead_score_bucket: bucketizeScore(data.lead_score || 0),
      });
    },
    [push]
  );

  const trackTemplateConversion = useCallback(
    (data: {
      days_to_conversion: number;
      structure_type: string;
      dynamic: boolean;
      channel: string;
    }) => {
      push('template.conversion', {
        days_to_conversion: bucketizeDays(data.days_to_conversion),
        structure_type: data.structure_type,
        dynamic: data.dynamic,
        channel: data.channel,
      });
    },
    [push]
  );

  // ════════════════════════════════════════
  //  CRM CORE
  // ════════════════════════════════════════

  const trackLeadCreated = useCallback(
    (data: { source_type: string; industry_segment?: string; lead_score?: number }) => {
      push('lead.created', {
        source_type: data.source_type,
        industry_segment: data.industry_segment,
        lead_score_bucket: bucketizeScore(data.lead_score || 0),
      });
    },
    [push]
  );

  const trackLeadMovedPipeline = useCallback(
    (data: { from_stage: string; to_stage: string; days_in_previous_stage: number }) => {
      push('lead.moved_pipeline', {
        from_stage: data.from_stage,
        to_stage: data.to_stage,
        days_in_previous_stage: bucketizeDays(data.days_in_previous_stage),
      });
    },
    [push]
  );

  const trackOpportunityCreated = useCallback(
    (data: { value?: number; industry_segment?: string; origin: string }) => {
      push('opportunity.created', {
        value_bucket: bucketizeValue(data.value || 0),
        industry_segment: data.industry_segment,
        origin: data.origin,
      });
    },
    [push]
  );

  // ════════════════════════════════════════
  //  AI MODULES
  // ════════════════════════════════════════

  const trackAISuggestionGenerated = useCallback(
    (data: { context: string; intent_detected?: string; recommended_tone?: string }) => {
      push('ai.suggestion.generated', data);
    },
    [push]
  );

  const trackAISuggestionAccepted = useCallback(
    (data: { context: string; tone_used?: string; edited_before_send: boolean }) => {
      push('ai.suggestion.accepted', data);
    },
    [push]
  );

  const trackAISuggestionRejected = useCallback(
    (data: { context: string; intent_detected?: string }) => {
      push('ai.suggestion.rejected', data);
    },
    [push]
  );

  // ════════════════════════════════════════
  //  AUTOMATIONS
  // ════════════════════════════════════════

  const trackAutomationCreated = useCallback(
    (data: { trigger_type: string; actions_count: number }) => {
      push('automation.created', {
        trigger_type: data.trigger_type,
        actions_count: data.actions_count,
        complexity_bucket: bucketizeCount(data.actions_count),
      });
    },
    [push]
  );

  const trackAutomationTriggered = useCallback(
    (data: { trigger_type: string; success: boolean }) => {
      push('automation.triggered', data);
    },
    [push]
  );

  // ════════════════════════════════════════
  //  BILLING
  // ════════════════════════════════════════

  const trackCheckoutStarted = useCallback(
    (data: { plan_type: string; upgrade_from_plan?: string }) => {
      push('checkout.started', data);
    },
    [push]
  );

  const trackCheckoutCompleted = useCallback(
    (data: { plan_type: string; billing_cycle: string }) => {
      push('checkout.completed', data);
    },
    [push]
  );

  return {
    // Inbox
    trackInboxOpened,
    trackConversationOpened,
    trackConversationReplied,
    trackConversationConverted,
    // Templates
    trackTemplateCreated,
    trackTemplateUsed,
    trackTemplateConversion,
    // CRM
    trackLeadCreated,
    trackLeadMovedPipeline,
    trackOpportunityCreated,
    // AI
    trackAISuggestionGenerated,
    trackAISuggestionAccepted,
    trackAISuggestionRejected,
    // Automations
    trackAutomationCreated,
    trackAutomationTriggered,
    // Billing
    trackCheckoutStarted,
    trackCheckoutCompleted,
  };
}
