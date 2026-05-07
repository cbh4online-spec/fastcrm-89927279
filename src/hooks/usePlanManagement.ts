import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function usePlatformFeatures() {
  return useQuery({
    queryKey: ["platform-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_features")
        .select("*")
        .order("module")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBillingPlansAdmin() {
  return useQuery({
    queryKey: ["billing-plans-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_plans")
        .select("*, billing_plan_features(*)")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBillingAddonsAdmin() {
  return useQuery({
    queryKey: ["billing-addons-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_addons")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCommercialPackages() {
  return useQuery({
    queryKey: ["commercial-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commercial_packages")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkspaceCurrentPlan() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["workspace-current-plan", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data: sub } = await supabase
        .from("workspace_subscriptions")
        .select("*, billing_plans(*, billing_plan_features(*))")
        .eq("workspace_id", wsId!)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: addons } = await supabase
        .from("workspace_addons")
        .select("*, billing_addons(*)")
        .eq("workspace_id", wsId!)
        .eq("status", "active");

      const { data: requests } = await supabase
        .from("workspace_upgrade_requests")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(20);

      return { subscription: sub, addons: addons ?? [], requests: requests ?? [] };
    },
  });
}

export function useUpgradeRequests() {
  return useQuery({
    queryKey: ["upgrade-requests-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_upgrade_requests")
        .select("*, current_plan:billing_plans!workspace_upgrade_requests_current_plan_id_fkey(name, code), requested_plan:billing_plans!workspace_upgrade_requests_requested_plan_id_fkey(name, code), workspace:workspaces(name, slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFeatureAccessLogs() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["feature-access-logs", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_access_logs")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRequestUpgrade() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request_type?: string;
      requested_plan_slug?: string;
      requested_addon_slug?: string;
      reason?: string;
      usage_context?: Record<string, unknown>;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase.functions.invoke("plan-request-upgrade", {
        body: { workspace_id: currentWorkspace.id, ...input },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pedido enviado à equipa comercial");
      qc.invalidateQueries({ queryKey: ["workspace-current-plan"] });
      qc.invalidateQueries({ queryKey: ["upgrade-requests-admin"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro a enviar pedido"),
  });
}

export async function checkFeatureAccess(workspaceId: string, featureKey: string) {
  const { data, error } = await supabase.rpc("check_feature_access", {
    _workspace_id: workspaceId,
    _feature_key: featureKey,
  });
  if (error) throw error;
  return data as {
    allowed: boolean;
    plan_code: string | null;
    plan_enabled: boolean;
    addon_unlock: boolean;
    feature_key: string;
  };
}
