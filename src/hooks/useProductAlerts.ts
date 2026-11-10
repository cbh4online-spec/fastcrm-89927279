import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AlertType = "price_drop" | "back_in_stock";

export interface ProductAlert {
  id: string;
  workspace_id: string;
  product_id: string;
  email: string;
  alert_type: AlertType;
  target_price: number | null;
  is_active: boolean;
  notified_at: string | null;
  created_at: string;
}

export function useProductAlerts(productId: string | undefined, email: string | undefined) {
  return useQuery({
    queryKey: ["product-alerts", productId, email],
    queryFn: async () => {
      if (!productId || !email) return [];
      const { data, error } = await supabase.rpc("store_product_alert_status", {
        p_product_id: productId,
        p_email: email,
      });
      if (error) throw error;
      return (data || []) as ProductAlert[];
    },
    enabled: !!productId && !!email,
  });
}

export function useCreateProductAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alert: {
      workspace_id: string;
      product_id: string;
      email: string;
      alert_type: AlertType;
      target_price?: number | null;
    }) => {
      const { error } = await supabase.from("store_product_alerts").insert({
        workspace_id: alert.workspace_id,
        product_id: alert.product_id,
        email: alert.email.toLowerCase().trim(),
        alert_type: alert.alert_type,
        target_price: alert.target_price || null,
      });
      if (error) {
        if (error.code === "23505") {
          throw new Error("Já tem um alerta ativo para este produto");
        }
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product-alerts", vars.product_id] });
      toast.success(
        vars.alert_type === "price_drop"
          ? "Alerta de preço ativado! Será notificado por email."
          : "Alerta de stock ativado! Será notificado quando voltar ao stock."
      );
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useCancelProductAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ alertId, productId, email }: { alertId: string; productId: string; email: string }) => {
      const { data, error } = await supabase.rpc("store_cancel_product_alert", { p_alert_id: alertId, p_email: email });
      if (error) throw error;
      if (!data) throw new Error("Alerta não encontrado");
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ["product-alerts", productId] });
      toast.success("Alerta cancelado");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
