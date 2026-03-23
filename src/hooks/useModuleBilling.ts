import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ModuleSubscriptionInfo {
  status: string;
  pricing_model: string;
  price_eur: number;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
}

export function useModuleBilling(moduleId?: string) {
  const { currentWorkspace } = useWorkspace();
  const [subscription, setSubscription] = useState<ModuleSubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!moduleId || !currentWorkspace?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("workspace_modules")
        .select("status, pricing_model, price_eur, cancel_at_period_end, current_period_end")
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", moduleId)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (err) {
      console.error("Error fetching module subscription:", err);
    } finally {
      setIsLoading(false);
    }
  }, [moduleId, currentWorkspace?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    isLoading,
    isActive: subscription?.status === "active",
    isPaid: subscription?.pricing_model === "monthly",
    willCancel: subscription?.cancel_at_period_end || false,
    refresh: fetchSubscription,
  };
}
