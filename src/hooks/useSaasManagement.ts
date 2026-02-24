import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { 
  WorkspaceUsage, 
  UsageQuota, 
  UsageAlert, 
  PlanFeature,
  SubscriptionPlan 
} from "@/types/saas";

export function useSaasManagement() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch workspace usage counts
  const { data: usage, isLoading: usageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ["workspace-usage", workspaceId],
    queryFn: async (): Promise<WorkspaceUsage> => {
      if (!workspaceId) throw new Error("No workspace");
      
      const { data, error } = await supabase.rpc("get_workspace_usage_counts", {
        p_workspace_id: workspaceId,
      });

      if (error) throw error;
      return data as unknown as WorkspaceUsage;
    },
    enabled: !!workspaceId,
  });

  // Fetch plan features for current plan
  const { data: planFeatures, isLoading: featuresLoading } = useQuery({
    queryKey: ["plan-features"],
    queryFn: async (): Promise<PlanFeature[]> => {
      const { data, error } = await supabase
        .from("plan_features")
        .select("*")
        .order("plan", { ascending: true });

      if (error) throw error;
      return data as unknown as PlanFeature[];
    },
  });

  // Fetch usage alerts
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["usage-alerts", workspaceId],
    queryFn: async (): Promise<UsageAlert[]> => {
      if (!workspaceId) throw new Error("No workspace");
      
      const { data, error } = await supabase
        .from("usage_alerts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as UsageAlert[];
    },
    enabled: !!workspaceId,
  });

  // Check quota for a resource
  const checkQuota = async (resourceType: string): Promise<UsageQuota> => {
    if (!workspaceId) {
      return { resource_type: resourceType, current: 0, limit: -1, percent: 0, allowed: true };
    }

    const { data, error } = await supabase.rpc("check_workspace_quota", {
      p_workspace_id: workspaceId,
      p_resource_type: resourceType,
    });

    if (error) throw error;
    return { resource_type: resourceType, ...(data as Omit<UsageQuota, 'resource_type'>) };
  };

  // Check if feature is enabled
  const isFeatureEnabled = async (featureKey: string): Promise<boolean> => {
    if (!workspaceId) return false;

    const { data, error } = await supabase.rpc("is_feature_enabled", {
      p_workspace_id: workspaceId,
      p_feature_key: featureKey,
    });

    if (error) return false;
    return data as boolean;
  };

  // Dismiss alert mutation
  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("usage_alerts")
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString(),
          dismissed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usage-alerts", workspaceId] });
    },
    onError: () => {
      toast.error("Erro ao dispensar alerta");
    },
  });

  // Get features for a specific plan
  const getFeaturesForPlan = (plan: SubscriptionPlan) => {
    if (!planFeatures) return [];
    return planFeatures.filter(f => f.plan === plan);
  };

  // Get limit for a specific feature and plan
  const getPlanLimit = (plan: SubscriptionPlan, featureKey: string): number | null => {
    if (!planFeatures) return null;
    const feature = planFeatures.find(f => f.plan === plan && f.feature_key === featureKey);
    return feature?.limit_value ?? null;
  };

  // Check if feature is enabled for plan
  const isPlanFeatureEnabled = (plan: SubscriptionPlan, featureKey: string): boolean => {
    if (!planFeatures) return false;
    const feature = planFeatures.find(f => f.plan === plan && f.feature_key === featureKey);
    return feature?.enabled ?? false;
  };

  return {
    // Data
    usage,
    alerts: alerts || [],
    planFeatures: planFeatures || [],
    
    // Loading states
    isLoading: usageLoading || featuresLoading || alertsLoading,
    usageLoading,
    featuresLoading,
    alertsLoading,
    
    // Functions
    checkQuota,
    isFeatureEnabled,
    dismissAlert,
    getFeaturesForPlan,
    getPlanLimit,
    isPlanFeatureEnabled,
    refetchUsage,
    refetchAlerts,
  };
}

// Hook for checking quotas before creating entities
export function useQuotaCheck(resourceType: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: quota, isLoading, refetch } = useQuery({
    queryKey: ["quota-check", workspaceId, resourceType],
    queryFn: async (): Promise<UsageQuota> => {
      if (!workspaceId) {
        return { resource_type: resourceType, current: 0, limit: -1, percent: 0, allowed: true };
      }

      const { data, error } = await supabase.rpc("check_workspace_quota", {
        p_workspace_id: workspaceId,
        p_resource_type: resourceType,
      });

      if (error) throw error;
      return { resource_type: resourceType, ...(data as Omit<UsageQuota, 'resource_type'>) };
    },
    enabled: !!workspaceId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const isAtLimit = quota?.percent === 100;
  const isNearLimit = (quota?.percent ?? 0) >= 80;
  const isCritical = (quota?.percent ?? 0) >= 90;

  return {
    quota,
    isLoading,
    isAtLimit,
    isNearLimit,
    isCritical,
    canCreate: quota?.allowed ?? true,
    refetch,
  };
}

// Hook for feature gating
export function useFeatureAccess(featureKey: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ["feature-access", workspaceId, featureKey],
    queryFn: async (): Promise<boolean> => {
      if (!workspaceId) return false;

      const { data, error } = await supabase.rpc("is_feature_enabled", {
        p_workspace_id: workspaceId,
        p_feature_key: featureKey,
      });

      if (error) return false;
      return data as boolean;
    },
    enabled: !!workspaceId,
    staleTime: 60000, // Cache for 1 minute
  });

  return {
    hasAccess: hasAccess ?? false,
    isLoading,
  };
}
