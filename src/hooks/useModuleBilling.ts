import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ModuleCreditBalance {
  id: string;
  module_id: string;
  workspace_id: string;
  credits_total: number;
  credits_used: number;
  credits_remaining: number;
  extra_credits: number;
  extra_credits_used: number;
  period_start: string;
  period_end: string;
}

export interface ModuleUsageStats {
  module_id: string;
  period: string;
  total_credits_used: number;
  total_actions: number;
  actions_breakdown: Record<string, { count: number; credits: number }>;
  average_daily_usage: number;
  projected_monthly_usage: number;
}

export interface ModuleSubscription {
  id: string;
  module_id: string;
  workspace_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits_amount: number;
  price: number;
  currency: string;
  discount_percent: number | null;
  module_ids: string[] | null;
}

export function useModuleBilling(moduleId?: string) {
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();
  
  const [creditBalance, setCreditBalance] = useState<ModuleCreditBalance | null>(null);
  const [usageStats, setUsageStats] = useState<ModuleUsageStats | null>(null);
  const [subscription, setSubscription] = useState<ModuleSubscription | null>(null);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch credit balance
  const fetchCreditBalance = useCallback(async () => {
    if (!moduleId || !currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from("workspace_credit_balances")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", moduleId)
        .maybeSingle();

      if (error) throw error;
      setCreditBalance(data);
    } catch (err) {
      console.error("Error fetching credit balance:", err);
    }
  }, [moduleId, currentWorkspace?.id]);

  // Fetch usage stats
  const fetchUsageStats = useCallback(async () => {
    if (!moduleId || !currentWorkspace?.id) return;

    try {
      const { data, error } = await workspaceClient.functions.invoke("module-usage-stats", {
        body: { module_id: moduleId, workspace_id: currentWorkspace.id },
      });

      if (error) throw error;
      setUsageStats(data);
    } catch (err) {
      console.error("Error fetching usage stats:", err);
    }
  }, [moduleId, currentWorkspace?.id, workspaceClient]);

  // Fetch subscription
  const fetchSubscription = useCallback(async () => {
    if (!moduleId || !currentWorkspace?.id) return;

    try {
      const { data, error } = await supabase
        .from("workspace_module_subscriptions")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("module_id", moduleId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (err) {
      console.error("Error fetching subscription:", err);
    }
  }, [moduleId, currentWorkspace?.id]);

  // Fetch credit packages
  const fetchCreditPackages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("credit_packages")
        .select("*")
        .eq("is_active", true)
        .order("credits_amount", { ascending: true });

      if (error) throw error;
      
      // Filter by module if specified
      const packages = moduleId 
        ? data?.filter(pkg => !pkg.module_ids || pkg.module_ids.includes(moduleId))
        : data;
      
      setCreditPackages(packages || []);
    } catch (err) {
      console.error("Error fetching credit packages:", err);
    }
  }, [moduleId]);

  // Check credits before action
  const checkCredits = useCallback(async (actionKey: string, quantity: number = 1): Promise<boolean> => {
    if (!moduleId || !currentWorkspace?.id) return false;

    try {
      const { data, error } = await workspaceClient.functions.invoke("module-check-credits", {
        body: {
          module_id: moduleId,
          workspace_id: currentWorkspace.id,
          action_key: actionKey,
          quantity,
        },
      });

      if (error) throw error;
      return data?.has_credits ?? false;
    } catch (err) {
      console.error("Error checking credits:", err);
      return false;
    }
  }, [moduleId, currentWorkspace?.id, workspaceClient]);

  // Consume credits
  const consumeCredits = useCallback(async (
    actionKey: string,
    quantity: number = 1,
    metadata?: Record<string, unknown>
  ): Promise<boolean> => {
    if (!moduleId || !currentWorkspace?.id) return false;

    try {
      const { data, error } = await workspaceClient.functions.invoke("module-consume-credits", {
        body: {
          module_id: moduleId,
          workspace_id: currentWorkspace.id,
          action_key: actionKey,
          quantity,
          metadata,
        },
      });

      if (error) throw error;
      
      // Refresh balance after consumption
      await fetchCreditBalance();
      
      return data?.success ?? false;
    } catch (err) {
      console.error("Error consuming credits:", err);
      toast.error("Erro ao processar créditos");
      return false;
    }
  }, [moduleId, currentWorkspace?.id, workspaceClient, fetchCreditBalance]);

  // Purchase credits
  const purchaseCredits = useCallback(async (packageId: string): Promise<string | null> => {
    if (!moduleId || !currentWorkspace?.id) return null;

    try {
      const { data, error } = await workspaceClient.functions.invoke("module-purchase-credits", {
        body: {
          module_id: moduleId,
          workspace_id: currentWorkspace.id,
          package_id: packageId,
        },
      });

      if (error) throw error;
      return data?.url ?? null;
    } catch (err) {
      console.error("Error purchasing credits:", err);
      toast.error("Erro ao iniciar compra de créditos");
      return null;
    }
  }, [moduleId, currentWorkspace?.id, workspaceClient]);

  // Subscribe to module
  const subscribeToModule = useCallback(async (billingCycle: "monthly" | "yearly" = "monthly"): Promise<string | null> => {
    if (!moduleId || !currentWorkspace?.id) return null;

    try {
      const { data, error } = await workspaceClient.functions.invoke("module-subscribe", {
        body: {
          module_id: moduleId,
          workspace_id: currentWorkspace.id,
          billing_cycle: billingCycle,
        },
      });

      if (error) throw error;
      
      // If free module, refresh subscription
      if (!data?.url) {
        await fetchSubscription();
        toast.success("Módulo ativado com sucesso!");
      }
      
      return data?.url ?? null;
    } catch (err) {
      console.error("Error subscribing to module:", err);
      toast.error("Erro ao subscrever módulo");
      return null;
    }
  }, [moduleId, currentWorkspace?.id, workspaceClient, fetchSubscription]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchCreditBalance(),
        fetchUsageStats(),
        fetchSubscription(),
        fetchCreditPackages(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, [fetchCreditBalance, fetchUsageStats, fetchSubscription, fetchCreditPackages]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Calculate usage percentage
  const usagePercentage = creditBalance 
    ? Math.round((creditBalance.credits_used / creditBalance.credits_total) * 100)
    : 0;

  const isAtLimit = creditBalance 
    ? creditBalance.credits_remaining <= 0
    : false;

  const isNearLimit = usagePercentage >= 80;

  return {
    creditBalance,
    usageStats,
    subscription,
    creditPackages,
    isLoading,
    error,
    usagePercentage,
    isAtLimit,
    isNearLimit,
    checkCredits,
    consumeCredits,
    purchaseCredits,
    subscribeToModule,
    refresh,
  };
}
