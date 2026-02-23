import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";
import { toast } from "sonner";

export interface B2BPlanItem {
  id: string;
  product_id: string;
  qty: number;
  price_override: number | null;
  product?: { id: string; name: string; base_price: number; images: string[] | null; sku: string | null };
}

export interface B2BPlanRun {
  id: string;
  run_at: string;
  status: string;
  order_id: string | null;
  invoice_id: string | null;
  notes: string | null;
  amount: number | null;
  created_at: string;
}

export interface B2BSubscriptionPlan {
  id: string;
  workspace_id: string;
  company_id: string;
  name: string;
  cadence: string;
  status: string;
  approval_mode: string;
  max_cycle_value: number | null;
  stripe_subscription_id: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
  items?: B2BPlanItem[];
  runs?: B2BPlanRun[];
}

export const CADENCE_LABELS: Record<string, string> = {
  monthly: "Mensal",
  "bi-monthly": "Bimestral",
  quarterly: "Trimestral",
};

export const PLAN_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Rascunho", color: "text-gray-600", bgColor: "bg-gray-100" },
  active: { label: "Ativo", color: "text-green-700", bgColor: "bg-green-100" },
  paused: { label: "Pausado", color: "text-yellow-700", bgColor: "bg-yellow-100" },
  cancelled: { label: "Cancelado", color: "text-red-700", bgColor: "bg-red-100" },
};

export const RUN_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "text-gray-500" },
  approved: { label: "Aprovado", color: "text-blue-600" },
  ordered: { label: "Encomendado", color: "text-indigo-600" },
  invoiced: { label: "Faturado", color: "text-green-600" },
  failed: { label: "Falhou", color: "text-red-600" },
  needs_attention: { label: "Atenção", color: "text-orange-600" },
};

export function useSubscriptionPlans() {
  const { clientUser } = useClientAuth();
  const queryClient = useQueryClient();
  const companyId = clientUser?.company_id;
  const workspaceId = clientUser?.workspace_id;

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["b2b-subscription-plans", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("b2b_subscription_plans")
        .select("*, items:b2b_subscription_plan_items(*, product:products(id, name, base_price, images, sku)), runs:b2b_subscription_runs(*)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as B2BSubscriptionPlan[];
    },
    enabled: !!companyId,
  });

  const createPlan = useMutation({
    mutationFn: async (input: {
      name: string;
      cadence: string;
      approval_mode: string;
      max_cycle_value?: number;
      items: { product_id: string; qty: number; price_override?: number }[];
    }) => {
      if (!companyId || !workspaceId) throw new Error("No company");
      const { data: plan, error } = await supabase
        .from("b2b_subscription_plans")
        .insert({
          workspace_id: workspaceId,
          company_id: companyId,
          name: input.name,
          cadence: input.cadence,
          approval_mode: input.approval_mode,
          max_cycle_value: input.max_cycle_value || null,
          created_by: clientUser?.id,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;

      if (input.items.length > 0) {
        const { error: itemsError } = await supabase.from("b2b_subscription_plan_items").insert(
          input.items.map((it) => ({ plan_id: plan.id, product_id: it.product_id, qty: it.qty, price_override: it.price_override || null }))
        );
        if (itemsError) throw itemsError;
      }
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-subscription-plans"] });
      toast.success("Plano criado!");
    },
    onError: () => toast.error("Erro ao criar plano"),
  });

  const activePlans = plans.filter((p) => p.status === "active");
  const estimatedMRR = activePlans.reduce((sum, plan) => {
    const planTotal = (plan.items || []).reduce((s, item) => {
      const price = item.price_override ?? item.product?.base_price ?? 0;
      return s + price * item.qty;
    }, 0);
    const divisor = plan.cadence === "quarterly" ? 3 : plan.cadence === "bi-monthly" ? 2 : 1;
    return sum + planTotal / divisor;
  }, 0);

  return {
    plans,
    activePlans,
    isLoading,
    createPlan: createPlan.mutateAsync,
    creating: createPlan.isPending,
    estimatedMRR,
  };
}
