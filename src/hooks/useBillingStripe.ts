/**
 * Hooks para o ciclo Stripe da Fase 1M:
 *  - useStartCheckout: inicia checkout para um billing_plan + intervalo.
 *  - useOpenCustomerPortal: abre o Stripe Customer Portal.
 *  - useSyncPlanToStripe: super admin sincroniza um billing_plan com Stripe.
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useStartCheckout() {
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (params: {
      billing_plan_id: string;
      interval: "month" | "year";
      successUrl?: string;
      cancelUrl?: string;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { workspaceId: currentWorkspace.id, ...params },
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Falha ao criar sessão de checkout");
      return data as { url: string; sessionId: string };
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useOpenCustomerPortal() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {},
      });
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Falha ao abrir portal");
      return data as { url: string };
    },
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSyncPlanToStripe() {
  return useMutation({
    mutationFn: async (plan_id: string) => {
      const { data, error } = await supabase.functions.invoke("billing-sync-plan-to-stripe", {
        body: { plan_id },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Erro ao sincronizar com Stripe");
      return data as {
        ok: true;
        skipped?: boolean;
        stripe_product_id?: string;
        stripe_price_id_monthly?: string | null;
        stripe_price_id_annual?: string | null;
      };
    },
    onSuccess: (data) => {
      if (data.skipped) {
        toast.info("Plano enterprise — não sincronizado com Stripe.");
      } else {
        toast.success("Plano sincronizado com Stripe.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
