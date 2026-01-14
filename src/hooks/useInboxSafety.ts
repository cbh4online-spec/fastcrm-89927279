import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import {
  InboxSafetyConfig,
  DEFAULT_INBOX_SAFETY_CONFIG,
  performInboxSafetyCheck,
  checkMessageLoop,
  recordMessage,
  queueActionForConfirmation,
  confirmAction,
  cancelAction,
  getPendingActionsForConversation,
  getInboxSafetyStatus,
  ConfirmableAction,
  requiresConfirmation,
} from "@/lib/inboxSafety";
import { useAutomationGlobalPause } from "./useAutomationSafety";

// Hook to check if inbox automations are paused
export function useInboxAutomationsPause() {
  return useQuery({
    queryKey: ["inbox_automations_pause"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "inbox_automations_pause")
        .maybeSingle();

      if (error) throw error;
      return data?.value === true || data?.value === "true";
    },
  });
}

// Hook to toggle inbox automations pause
export function useToggleInboxAutomationsPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paused: boolean) => {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("key", "inbox_automations_pause")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("admin_settings")
          .update({ value: paused })
          .eq("key", "inbox_automations_pause");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_settings")
          .insert({
            key: "inbox_automations_pause",
            value: paused,
            description: "Pause all inbox-triggered automations",
          });

        if (error) throw error;
      }

      return paused;
    },
    onSuccess: (paused) => {
      queryClient.invalidateQueries({ queryKey: ["inbox_automations_pause"] });
      toast.success(
        paused
          ? "Automações de inbox pausadas"
          : "Automações de inbox retomadas"
      );
    },
    onError: (error) => {
      toast.error(`Erro ao alterar estado: ${error.message}`);
    },
  });
}

// Hook to get inbox safety config
export function useInboxSafetyConfig() {
  return useQuery({
    queryKey: ["inbox_safety_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "inbox_safety_config")
        .maybeSingle();

      if (error) throw error;

      if (!data?.value || typeof data.value !== "object") {
        return DEFAULT_INBOX_SAFETY_CONFIG;
      }

      return {
        ...DEFAULT_INBOX_SAFETY_CONFIG,
        ...(data.value as Partial<InboxSafetyConfig>),
      };
    },
  });
}

// Hook to perform safety check before inbox action
export function useInboxSafetyCheck() {
  const { data: isGloballyPaused = false } = useAutomationGlobalPause();
  const { data: isInboxPaused = false } = useInboxAutomationsPause();
  const { data: safetyConfig } = useInboxSafetyConfig();

  return (
    action: string,
    conversationId: string,
    isAutomatedAction: boolean = false
  ) => {
    return performInboxSafetyCheck({
      action,
      conversationId,
      isGloballyPaused,
      isInboxAutomationsPaused: isInboxPaused,
      isAutomatedAction,
    });
  };
}

// Hook to record a message for loop detection
export function useRecordMessage() {
  return useMutation({
    mutationFn: async ({
      conversationId,
      direction,
      isAutomated = false,
    }: {
      conversationId: string;
      direction: "inbound" | "outbound";
      isAutomated?: boolean;
    }) => {
      recordMessage(conversationId, direction, isAutomated);
      return { conversationId, direction };
    },
  });
}

// Hook to check for message loops
export function useCheckMessageLoop() {
  const { data: safetyConfig } = useInboxSafetyConfig();

  return (conversationId: string) => {
    return checkMessageLoop(
      conversationId,
      safetyConfig?.messageLoopConfig
    );
  };
}

// Hook to manage pending confirmations
export function usePendingConfirmations(conversationId?: string) {
  const queryClient = useQueryClient();

  const pendingActions = conversationId
    ? getPendingActionsForConversation(conversationId)
    : [];

  const queueAction = useMutation({
    mutationFn: async ({
      action,
      conversationId,
      data,
      leadId,
    }: {
      action: ConfirmableAction;
      conversationId: string;
      data: Record<string, unknown>;
      leadId?: string;
    }) => {
      return queueActionForConfirmation(action, conversationId, data, leadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_confirmations"] });
      toast.info("Ação pendente de confirmação");
    },
  });

  const confirmPendingAction = useMutation({
    mutationFn: async (actionId: string) => {
      const action = confirmAction(actionId);
      if (!action) {
        throw new Error("Ação não encontrada ou expirada");
      }
      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_confirmations"] });
    },
  });

  const cancelPendingAction = useMutation({
    mutationFn: async (actionId: string) => {
      const success = cancelAction(actionId);
      if (!success) {
        throw new Error("Ação não encontrada");
      }
      return actionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_confirmations"] });
      toast.success("Ação cancelada");
    },
  });

  return {
    pendingActions,
    queueAction,
    confirmPendingAction,
    cancelPendingAction,
  };
}

// Hook to get overall inbox safety status
export function useInboxSafetyStatus(conversationId?: string) {
  const { data: isGloballyPaused = false } = useAutomationGlobalPause();
  const { data: isInboxPaused = false } = useInboxAutomationsPause();
  const { data: safetyConfig } = useInboxSafetyConfig();

  if (!conversationId) {
    return {
      isGloballyPaused,
      isInboxPaused,
      pendingConfirmations: 0,
      recentMessageCount: 0,
      maxMessagesPerHour: 20,
      loopDetected: false,
      rateLimitPercentage: 0,
    };
  }

  return getInboxSafetyStatus(
    conversationId,
    isGloballyPaused,
    isInboxPaused,
    safetyConfig
  );
}

// Hook for safe message sending with confirmation
export function useSafeMessageSend() {
  const checkSafety = useInboxSafetyCheck();
  const { queueAction, confirmPendingAction } = usePendingConfirmations();
  const recordMsg = useRecordMessage();

  return {
    // Check if message can be sent
    checkCanSend: (conversationId: string, isAutomated: boolean = false) => {
      return checkSafety("send_message", conversationId, isAutomated);
    },

    // Queue message for confirmation (for automated sends)
    queueForConfirmation: (
      conversationId: string,
      messageContent: string,
      leadId?: string,
      templateId?: string
    ) => {
      return queueAction.mutateAsync({
        action: "send_message",
        conversationId,
        data: {
          content: messageContent,
          template_id: templateId,
        },
        leadId,
      });
    },

    // Confirm and record message
    confirmAndRecord: async (
      actionId: string,
      conversationId: string,
      isAutomated: boolean = false
    ) => {
      const action = await confirmPendingAction.mutateAsync(actionId);
      await recordMsg.mutateAsync({
        conversationId,
        direction: "outbound",
        isAutomated,
      });
      return action;
    },

    // Record sent message (for manual sends)
    recordSent: (conversationId: string, isAutomated: boolean = false) => {
      return recordMsg.mutateAsync({
        conversationId,
        direction: "outbound",
        isAutomated,
      });
    },

    // Record received message
    recordReceived: (conversationId: string) => {
      return recordMsg.mutateAsync({
        conversationId,
        direction: "inbound",
        isAutomated: false,
      });
    },
  };
}

// Export utility function
export { requiresConfirmation };
