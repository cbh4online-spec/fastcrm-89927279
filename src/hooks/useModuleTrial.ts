import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface TrialStatus {
  installed: boolean;
  status: "trial" | "active" | "expired" | "canceled" | null;
  is_trial: boolean;
  is_paid: boolean;
  uses_consumed: number;
  uses_limit: number | null;
  uses_remaining: number;
  usage_percent: number;
  days_remaining: number | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  can_use: boolean;
  can_start_trial: boolean;
  value_generated: Record<string, unknown>;
}

export interface TrialAlert {
  type: "usage_70" | "usage_90" | "last_use" | "trial_expiring" | "trial_expired";
  message: string;
}

export interface ConsumeResult {
  success: boolean;
  can_use: boolean;
  uses_consumed?: number;
  uses_limit?: number;
  uses_remaining?: number;
  is_paid?: boolean;
  alert?: TrialAlert;
  error?: string;
  show_upgrade_modal?: boolean;
}

export function useModuleTrial(moduleId: string) {
  const { currentWorkspace } = useWorkspace();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAlert, setPendingAlert] = useState<TrialAlert | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchTrialStatus = useCallback(async () => {
    if (!currentWorkspace?.id || !moduleId) return null;

    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc("get_module_trial_status", {
        p_workspace_id: currentWorkspace.id,
        p_module_id: moduleId,
      });

      if (error) {
        console.error("Error fetching trial status:", error);
        return null;
      }

      const status = data as unknown as TrialStatus;
      setTrialStatus(status);
      return status;
    } catch (err) {
      console.error("Error in fetchTrialStatus:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, moduleId]);

  const startTrial = useCallback(async () => {
    if (!currentWorkspace?.id || !moduleId) {
      toast.error("Nenhum workspace selecionado");
      return false;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc("start_module_trial", {
        p_workspace_id: currentWorkspace.id,
        p_module_id: moduleId,
        p_user_id: user?.id,
      });

      if (error) {
        console.error("Error starting trial:", error);
        toast.error("Erro ao iniciar trial");
        return false;
      }

      const result = data as { success: boolean; already_active?: boolean; trial_uses_limit?: number };
      
      if (result.success) {
        if (result.already_active) {
          toast.info("Este módulo já está ativo");
        } else {
          toast.success(`Trial iniciado! Tens ${result.trial_uses_limit} utilizações gratuitas.`);
        }
        await fetchTrialStatus();
        return true;
      }

      return false;
    } catch (err) {
      console.error("Error in startTrial:", err);
      toast.error("Erro ao iniciar trial");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, moduleId, fetchTrialStatus]);

  const consumeUsage = useCallback(async (
    actionKey: string,
    metadata: Record<string, unknown> = {}
  ): Promise<ConsumeResult> => {
    if (!currentWorkspace?.id || !moduleId) {
      return { success: false, can_use: false, error: "no_workspace" };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc("consume_trial_usage", {
        p_workspace_id: currentWorkspace.id,
        p_module_id: moduleId,
        p_action_key: actionKey,
        p_user_id: user?.id,
        p_metadata: metadata as Record<string, string>,
      });

      if (error) {
        console.error("Error consuming usage:", error);
        return { success: false, can_use: false, error: error.message };
      }

      const result = data as unknown as ConsumeResult;

      // Handle alerts
      if (result.alert) {
        setPendingAlert(result.alert);
        
        // Show toast based on alert type
        if (result.alert.type === "last_use") {
          toast.warning(result.alert.message, {
            duration: 8000,
            action: {
              label: "Ativar Módulo",
              onClick: () => setShowUpgradeModal(true),
            },
          });
        } else if (result.alert.type === "usage_90") {
          toast.info(result.alert.message, {
            duration: 6000,
          });
        } else if (result.alert.type === "usage_70") {
          toast.info(result.alert.message, {
            duration: 4000,
          });
        }
      }

      // Show upgrade modal if needed
      if (result.show_upgrade_modal) {
        setShowUpgradeModal(true);
      }

      // Refresh status
      await fetchTrialStatus();

      return result;
    } catch (err) {
      console.error("Error in consumeUsage:", err);
      return { success: false, can_use: false, error: "unknown_error" };
    }
  }, [currentWorkspace?.id, moduleId, fetchTrialStatus]);

  const dismissAlert = useCallback(() => {
    setPendingAlert(null);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
  }, []);

  return {
    trialStatus,
    isLoading,
    pendingAlert,
    showUpgradeModal,
    fetchTrialStatus,
    startTrial,
    consumeUsage,
    dismissAlert,
    closeUpgradeModal,
    setShowUpgradeModal,
  };
}
