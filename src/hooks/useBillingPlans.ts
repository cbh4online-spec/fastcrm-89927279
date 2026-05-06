import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface BillingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  public_description: string | null;
  audience: string | null;
  promise: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  currency: string;
  billing_interval: string;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
  recommended: boolean;
  enterprise: boolean;
  metadata: Record<string, any>;
}

export interface BillingPlanFeature {
  id: string;
  plan_id: string;
  feature_key: string;
  feature_name: string;
  feature_description: string | null;
  included: boolean;
  limit_value: number | null;
  limit_unit: string | null;
  display_value: string | null;
  category: string | null;
  sort_order: number;
}

export interface BillingAddon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  unit_name: string | null;
  price_per_unit: number | null;
  currency: string;
  is_active: boolean;
}

export interface WorkspaceAddon {
  id: string;
  workspace_id: string;
  addon_id: string;
  quantity: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  addon?: BillingAddon;
}

export interface BillingChangeRequest {
  id: string;
  workspace_id: string;
  current_plan_id: string | null;
  requested_plan_id: string | null;
  requested_addon_id: string | null;
  request_type: "upgrade" | "downgrade" | "addon" | "cancel" | "enterprise_contact";
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  notes: string | null;
  admin_notes: string | null;
  contact_info: Record<string, any> | null;
  created_at: string;
  completed_at: string | null;
}

/* ---------- CATÁLOGO ---------- */

export function useBillingPlans() {
  return useQuery({
    queryKey: ["billing-plans"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_plans" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BillingPlan[];
    },
  });
}

export function useBillingPlanFeatures() {
  return useQuery({
    queryKey: ["billing-plan-features"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_plan_features" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BillingPlanFeature[];
    },
  });
}

export function useBillingAddons() {
  return useQuery({
    queryKey: ["billing-addons"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_addons" as any)
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BillingAddon[];
    },
  });
}

/* ---------- WORKSPACE ---------- */

export interface WorkspaceSubscription {
  id: string;
  workspace_id: string;
  billing_plan_id: string | null;
  plan: string;
  status: string;
  billing_interval: string | null;
  seats_included: number | null;
  seats_used: number | null;
  custom_limits: Record<string, any> | null;
  custom_price: number | null;
  currency: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  trial_ends_at: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_latest_invoice_id?: string | null;
  stripe_payment_status?: string | null;
  last_payment_at?: string | null;
  last_payment_amount?: number | null;
  last_payment_failure_at?: string | null;
  last_payment_failure_reason?: string | null;
}

export function useWorkspaceSubscription() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["workspace-subscription", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_subscriptions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WorkspaceSubscription | null;
    },
  });
}

export function useWorkspaceAddons() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["workspace-addons", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_addons" as any)
        .select("*, addon:billing_addons(*)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkspaceAddon[];
    },
  });
}

export function useChangeRequests() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["billing-change-requests", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_change_requests" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BillingChangeRequest[];
    },
  });
}

export function useCreateChangeRequest() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requested_plan_id?: string;
      requested_addon_id?: string;
      request_type: BillingChangeRequest["request_type"];
      notes?: string;
      contact_info?: Record<string, any>;
      current_plan_id?: string | null;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("billing_change_requests" as any)
        .insert({
          workspace_id: currentWorkspace.id,
          requested_by: user?.id ?? null,
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing-change-requests"] });
      toast.success("Pedido recebido. A equipa vai entrar em contacto.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------- FEATURE GATE ---------- */

export interface FeatureCheck {
  enabled: boolean;
  limit: number | null;
  usage: number;
  plan: string;
  unlimited: boolean;
}

/** Verifica acesso a uma feature do plano actual do workspace. */
export function useHasPlanFeature(featureKey: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["has-plan-feature", workspaceId, featureKey],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<FeatureCheck> => {
      const { data: sub } = await supabase
        .from("workspace_subscriptions")
        .select("billing_plan_id, plan, custom_limits")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let planId: string | null = (sub as any)?.billing_plan_id ?? null;
      const planCode = (sub as any)?.plan ?? "free";

      if (!planId) {
        const { data: planByCode } = await supabase
          .from("billing_plans" as any)
          .select("id")
          .eq("code", planCode === "basic" ? "starter" : planCode === "agency" ? "enterprise" : planCode)
          .maybeSingle();
        planId = (planByCode as any)?.id ?? null;
      }

      let feature: any = null;
      if (planId) {
        const { data } = await supabase
          .from("billing_plan_features" as any)
          .select("*")
          .eq("plan_id", planId)
          .eq("feature_key", featureKey)
          .maybeSingle();
        feature = data;
      }

      const customLimit = (sub as any)?.custom_limits?.[featureKey];
      const limit = customLimit ?? feature?.limit_value ?? null;

      // Buscar uso actual em cost_guard_monthly
      const month = new Date().toISOString().slice(0, 7);
      const { data: usageRow } = await supabase
        .from("cost_guard_monthly" as any)
        .select("total_quantity")
        .eq("workspace_id", workspaceId!)
        .eq("usage_type", featureKey)
        .eq("month", month + "-01")
        .maybeSingle();

      return {
        enabled: feature?.included ?? false,
        limit,
        usage: Number((usageRow as any)?.total_quantity ?? 0),
        plan: planCode,
        unlimited: feature?.included && limit === null,
      };
    },
  });
}
