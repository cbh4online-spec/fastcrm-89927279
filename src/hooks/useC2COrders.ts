import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useC2CBuyerOrders(workspaceId?: string) {
  return useQuery({
    queryKey: ["c2c-buyer-orders", workspaceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("c2c_orders")
        .select("*, c2c_listings(title, photos, price, currency)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useC2CSellerOrders(workspaceId?: string) {
  return useQuery({
    queryKey: ["c2c-seller-orders", workspaceId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("c2c_orders")
        .select("*, c2c_listings(title, photos, price, currency)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateOrderShipping(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, trackingCode, trackingUrl, shippingCarrier }: {
      orderId: string; trackingCode: string; trackingUrl?: string; shippingCarrier?: string;
    }) => {
      const { error } = await supabase
        .from("c2c_orders")
        .update({
          tracking_code: trackingCode,
          tracking_url: trackingUrl || null,
          shipping_carrier: shippingCarrier || null,
          status: "shipped",
          shipped_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-seller-orders"] });
      toast.success("Tracking atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useConfirmDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("c2c_orders")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-buyer-orders"] });
      toast.success("Entrega confirmada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
