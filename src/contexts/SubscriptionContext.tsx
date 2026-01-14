import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useWorkspace } from "./WorkspaceContext";
import { useWorkspaceInstance } from "./WorkspaceInstanceContext";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

// Plan definitions
export type SubscriptionPlan = "free" | "basic" | "pro" | "agency";

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

// Default free plan limits
const FREE_LIMITS: PlanLimits = {
  max_users: 1,
  max_workspaces: 1,
  dashboard_customization: false,
  sidebar_customization: false,
  user_layout_overrides: false,
  ai_suggestions: false,
  ai_insights: false,
  automation_custom_fields: false,
  max_automations: 0,
  monthly_ai_calls: 0,
  templates: false,
  white_label: false,
};

// Plan display info
export const PLAN_INFO: Record<SubscriptionPlan, {
  name: string;
  price: number;
  description: string;
  features: string[];
}> = {
  free: {
    name: "Free",
    price: 0,
    description: "Para experimentar o FastCRM",
    features: [
      "1 utilizador",
      "1 workspace",
      "CRM básico",
    ],
  },
  basic: {
    name: "Basic",
    price: 29,
    description: "Para equipas pequenas",
    features: [
      "Até 3 utilizadores",
      "1 workspace",
      "CRM, inbox e pagamentos",
      "5 regras de automação",
    ],
  },
  pro: {
    name: "Pro",
    price: 79,
    description: "Para equipas em crescimento",
    features: [
      "Até 10 utilizadores",
      "1 workspace",
      "Dashboards personalizáveis",
      "Sidebar configurável",
      "Sugestões de IA",
      "Insights de IA",
      "50 regras de automação",
      "500 chamadas IA/mês",
    ],
  },
  agency: {
    name: "Agency",
    price: 199,
    description: "Para agências e empresas",
    features: [
      "Utilizadores ilimitados",
      "Múltiplos workspaces",
      "Templates de configuração",
      "White-label branding",
      "Automações ilimitadas",
      "5000 chamadas IA/mês",
    ],
  },
};

// Feature to plan mapping for upgrade messages
const FEATURE_REQUIRED_PLAN: Record<keyof PlanLimits, SubscriptionPlan> = {
  max_users: "basic",
  max_workspaces: "agency",
  dashboard_customization: "pro",
  sidebar_customization: "pro",
  user_layout_overrides: "pro",
  ai_suggestions: "pro",
  ai_insights: "pro",
  automation_custom_fields: "pro",
  max_automations: "basic",
  monthly_ai_calls: "pro",
  templates: "agency",
  white_label: "agency",
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user, session } = useAuth();
  
  const [state, setState] = useState<SubscriptionState>({
    plan: "free",
    limits: FREE_LIMITS,
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
        plan: data.plan || "free",
        limits: data.limits || FREE_LIMITS,
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
    if (!currentWorkspace?.id || plan === "free") return;

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
      toast.error("Erro ao criar sessão de pagamento");
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
      toast.error("Erro ao abrir portal de gestão");
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
    return `Esta funcionalidade requer o plano ${planInfo.name} ou superior.`;
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
