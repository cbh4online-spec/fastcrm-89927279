import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWorkspace } from "./WorkspaceContext";
import { useWorkspaceInstance } from "./WorkspaceInstanceContext";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

// Plan definitions
export type SubscriptionPlan = "starter" | "growth" | "scale";

export interface PlanLimits {
  max_users: number;
  max_workspaces: number;
  dashboard_customization: boolean;
  sidebar_customization: boolean;
  user_layout_overrides: boolean;
  ai_suggestions: boolean;
  ai_insights: boolean;
  automation_custom_fields: boolean;
  max_automations: number;
  monthly_ai_calls: number;
  templates: boolean;
  white_label: boolean;
  multi_pipeline: boolean;
  marketplace_access: boolean;
  api_access: boolean;
  advanced_roles: boolean;
  priority_support: boolean;
}

export interface SubscriptionState {
  plan: SubscriptionPlan;
  limits: PlanLimits;
  subscribed: boolean;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  createCheckout: (plan: SubscriptionPlan) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  canUseFeature: (feature: keyof PlanLimits) => boolean;
  getUpgradeMessage: (feature: keyof PlanLimits) => string;
}

// Default starter plan limits
const STARTER_LIMITS: PlanLimits = {
  max_users: 3,
  max_workspaces: 1,
  dashboard_customization: false,
  sidebar_customization: false,
  user_layout_overrides: false,
  ai_suggestions: false,
  ai_insights: false,
  automation_custom_fields: false,
  max_automations: 3,
  monthly_ai_calls: 0,
  templates: false,
  white_label: false,
  multi_pipeline: false,
  marketplace_access: false,
  api_access: false,
  advanced_roles: false,
  priority_support: false,
};

// Plan display info
export const PLAN_INFO: Record<SubscriptionPlan, {
  name: string;
  price: number;
  description: string;
  features: string[];
}> = {
  starter: {
    name: "Starter",
    price: 0,
    description: "For getting started",
    features: [
      "1-3 users",
      "CRM core (Objects + Inbox)",
      "Basic health score",
      "1 pipeline",
      "3 automations",
    ],
  },
  growth: {
    name: "Growth",
    price: 49,
    description: "For growing teams",
    features: [
      "Up to 10 users",
      "Multi-pipeline",
      "Stage benchmarks",
      "Advanced automation templates",
      "Marketplace active",
      "AI suggestions & insights",
      "500 AI calls/month",
    ],
  },
  scale: {
    name: "Scale",
    price: 149,
    description: "For scaling companies",
    features: [
      "Unlimited users",
      "Advanced Intelligence",
      "Advanced automations",
      "API access",
      "Advanced roles",
      "Priority support",
      "White-label branding",
      "5,000 AI calls/month",
    ],
  },
};

// Feature to plan mapping for upgrade messages
const FEATURE_REQUIRED_PLAN: Record<keyof PlanLimits, SubscriptionPlan> = {
  max_users: "growth",
  max_workspaces: "scale",
  dashboard_customization: "growth",
  sidebar_customization: "growth",
  user_layout_overrides: "growth",
  ai_suggestions: "growth",
  ai_insights: "growth",
  automation_custom_fields: "growth",
  max_automations: "growth",
  monthly_ai_calls: "growth",
  templates: "scale",
  white_label: "scale",
  multi_pipeline: "growth",
  marketplace_access: "growth",
  api_access: "scale",
  advanced_roles: "scale",
  priority_support: "scale",
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user, session } = useAuth();
  
  const [state, setState] = useState<SubscriptionState>({
    plan: "starter",
    limits: STARTER_LIMITS,
    subscribed: false,
    subscriptionEnd: null,
    cancelAtPeriodEnd: false,
    isLoading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!currentWorkspace?.id || !session?.access_token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await workspaceClient.functions.invoke("check-subscription", {
        body: { workspaceId: currentWorkspace.id },
      });

      if (error) throw error;

      setState({
        plan: data.plan || "starter",
        limits: data.limits || STARTER_LIMITS,
        subscribed: data.subscribed || false,
        subscriptionEnd: data.subscription_end || null,
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to check subscription",
      }));
    }
  }, [currentWorkspace?.id, session?.access_token, workspaceClient]);

  const createCheckout = useCallback(async (plan: SubscriptionPlan) => {
    if (!currentWorkspace?.id || plan === "starter") return;

    try {
      const { data, error } = await workspaceClient.functions.invoke("create-checkout", {
        body: { plan, workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Error creating payment session");
    }
  }, [currentWorkspace?.id, workspaceClient]);

  const openCustomerPortal = useCallback(async () => {
    try {
      const { data, error } = await workspaceClient.functions.invoke("customer-portal");

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Error opening management portal");
    }
  }, [workspaceClient]);

  const canUseFeature = useCallback((feature: keyof PlanLimits): boolean => {
    const value = state.limits[feature];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    return false;
  }, [state.limits]);

  const getUpgradeMessage = useCallback((feature: keyof PlanLimits): string => {
    const requiredPlan = FEATURE_REQUIRED_PLAN[feature];
    const planInfo = PLAN_INFO[requiredPlan];
    return `This feature requires the ${planInfo.name} plan or higher.`;
  }, []);

  // Check subscription on mount and when workspace changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Periodic check every minute
  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        checkSubscription,
        createCheckout,
        openCustomerPortal,
        canUseFeature,
        getUpgradeMessage,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
