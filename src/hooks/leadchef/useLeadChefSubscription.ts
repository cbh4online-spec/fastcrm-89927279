import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export const LEADCHEF_FREE_LIMITS = {
  referrals: 1,
  leads: 1,
} as const;

export interface LeadChefSubscriptionInfo {
  subscribed: boolean;
  plan: "free" | "starter" | "growth";
  whatsapp: boolean;
  interval?: "month" | "year";
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

/** Estado da subscrição LeadChef (Stripe). Cache por 60s. */
export function useLeadChefSubscription() {
  const { user } = useAuth();
  return useQuery<LeadChefSubscriptionInfo>({
    queryKey: ["leadchef-subscription", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("leadchef-check-subscription", {
        body: {},
      });
      if (error) throw error;
      return (data as LeadChefSubscriptionInfo) ?? { subscribed: false, plan: "free", whatsapp: false };
    },
  });
}

/** Conta referrals + leads atuais para validar limites do plano free. */
export function useLeadChefFreeUsage() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["leadchef-free-usage", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const wsId = currentWorkspace!.id;
      const [refs, leads] = await Promise.all([
        (supabase as any)
          .from("leadchef_referrals")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId),
        (supabase as any)
          .from("leadchef_lead_profiles")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId),
      ]);
      return {
        referrals: refs.count ?? 0,
        leads: leads.count ?? 0,
      };
    },
  });
}
