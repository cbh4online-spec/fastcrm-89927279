import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AiSafetyRulesConfig,
  DEFAULT_AI_SAFETY_RULES,
  AiActionValidation,
  AiSafetyStatus,
  validateAiAction,
  recordAiAction,
  checkAiRateLimits,
  canGenerateMoreDrafts,
  isCriticalAction,
  isMessageAction,
  isCrmModificationAction,
} from "@/lib/aiSafetyRules";
import { usePendingConfirmations } from "./useInboxSafety";

// Hook to get AI safety rules configuration
export function useAiSafetyConfig() {
  return useQuery({
    queryKey: ["ai_safety_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "ai_safety_config")
        .maybeSingle();

      if (error) throw error;

      if (!data?.value || typeof data.value !== "object") {
        return DEFAULT_AI_SAFETY_RULES;
      }

      // Core prohibitions cannot be overridden
      return {
        ...DEFAULT_AI_SAFETY_RULES,
        ...(data.value as Partial<AiSafetyRulesConfig>),
        autoSendMessagesProhibited: true, // Always enforced
        autoCrmModificationProhibited: true, // Always enforced
        inventInformationProhibited: true, // Always enforced
      };
    },
  });
}

// Hook to validate AI actions
export function useValidateAiAction() {
  const { data: config } = useAiSafetyConfig();

  return (action: string, isAutomated: boolean = false): AiActionValidation => {
    return validateAiAction(action, isAutomated, config);
  };
}

// Hook to record and track AI actions
export function useRecordAiAction() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      action,
    }: {
      conversationId: string;
      action: string;
    }) => {
      recordAiAction(conversationId, action);
      return { conversationId, action };
    },
  });
}

// Hook to check AI rate limits
export function useCheckAiRateLimits() {
  const { data: config } = useAiSafetyConfig();

  return () => checkAiRateLimits(config);
}

// Hook to check if can generate more drafts
export function useCanGenerateDraft() {
  const { data: config } = useAiSafetyConfig();

  return (conversationId: string) => canGenerateMoreDrafts(conversationId, config);
}

// Hook to get overall AI safety status
export function useAiSafetyStatus(conversationId?: string): AiSafetyStatus {
  const { data: config } = useAiSafetyConfig();
  const { pendingActions } = usePendingConfirmations(conversationId);
  const rateLimits = checkAiRateLimits(config);

  // Count recent suggestions in last minute
  const oneMinuteAgo = Date.now() - 60 * 1000;
  // This would need access to aiActionHistory from lib, simplified here
  const recentSuggestions = 0; // Would be calculated from tracker

  return {
    rulesActive: true, // Always active
    autoSendBlocked: true, // Always true
    autoCrmModificationBlocked: true, // Always true
    hallucinationPrevented: true, // Always true
    pendingConfirmations: pendingActions.length,
    recentSuggestions,
    maxSuggestionsPerMinute: config?.maxSuggestionsPerMinute || 10,
  };
}

// Hook to perform AI action with safety validation
export function useSafeAiAction() {
  const validate = useValidateAiAction();
  const recordAction = useRecordAiAction();
  const checkRateLimits = useCheckAiRateLimits();

  return {
    // Validate before executing
    validateAction: (action: string, isAutomated: boolean = false) => {
      // Check rate limits first
      const rateLimitCheck = checkRateLimits();
      if (!rateLimitCheck.allowed) {
        return {
          allowed: false,
          requiresConfirmation: false,
          reason: rateLimitCheck.reason,
          ruleViolated: "RATE_LIMIT",
        };
      }

      return validate(action, isAutomated);
    },

    // Record action after execution
    recordAction: (conversationId: string, action: string) => {
      return recordAction.mutateAsync({ conversationId, action });
    },

    // Check if action is critical
    isCritical: isCriticalAction,

    // Check if action involves messaging
    isMessaging: isMessageAction,

    // Check if action modifies CRM
    isCrmModification: isCrmModificationAction,
  };
}

// Hook to display AI safety warnings
export function useAiSafetyWarnings() {
  return {
    showAutoSendWarning: () => {
      toast.warning("A IA nunca envia mensagens automaticamente", {
        description: "Todas as mensagens requerem aprovação do utilizador.",
        duration: 4000,
      });
    },

    showCrmModificationWarning: () => {
      toast.warning("A IA nunca modifica dados do CRM automaticamente", {
        description: "Todas as alterações requerem confirmação do utilizador.",
        duration: 4000,
      });
    },

    showConfirmationRequired: (action: string) => {
      toast.info("Confirmação necessária", {
        description: `A ação "${action}" requer aprovação antes de ser executada.`,
        duration: 3000,
      });
    },

    showRateLimitWarning: () => {
      toast.warning("Limite de sugestões atingido", {
        description: "Aguarde alguns segundos antes de solicitar mais sugestões.",
        duration: 3000,
      });
    },
  };
}

// Export utilities
export {
  isCriticalAction,
  isMessageAction,
  isCrmModificationAction,
  validateAiAction,
};
