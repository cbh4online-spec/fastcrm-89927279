import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoreOffer {
  id: string;
  workspace_id: string;
  product_id: string;
  customer_email: string;
  customer_name: string;
  contact_id: string | null;
  offered_price: number;
  original_price: number;
  currency: string;
  counter_price: number | null;
  status: string;
  message: string | null;
  admin_message: string | null;
  coupon_code: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export function useStoreOffers(workspaceId: string) {
  return useQuery({
    queryKey: ["store-offers", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_offers" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StoreOffer[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateStoreOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offer: {
      workspace_id: string;
      product_id: string;
      customer_email: string;
      customer_name: string;
      offered_price: number;
      original_price: number;
      currency: string;
      message?: string;
    }) => {
      const { data, error } = await supabase
        .from("store_offers" as any)
        .insert(offer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["store-offers", vars.workspace_id] });
      toast.success("Oferta enviada com sucesso!");
    },
    onError: () => toast.error("Erro ao enviar oferta"),
  });
}

function generateCouponCode(): string {
  return "OFERTA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useRespondToOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      offerId,
      workspaceId,
      action,
      counterPrice,
      adminMessage,
      productId,
    }: {
      offerId: string;
      workspaceId: string;
      action: "accepted" | "rejected" | "countered";
      counterPrice?: number;
      adminMessage?: string;
      productId?: string;
    }) => {
      const update: Record<string, any> = {
        status: action,
        admin_message: adminMessage || null,
      };

      if (action === "countered" && counterPrice) {
        update.counter_price = counterPrice;
      }

      if (action === "accepted") {
        update.coupon_code = generateCouponCode();
      }

      const { error } = await supabase
        .from("store_offers" as any)
        .update(update)
        .eq("id", offerId);
      if (error) throw error;
      return { workspaceId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["store-offers", result.workspaceId] });
      toast.success("Oferta atualizada!");
    },
    onError: () => toast.error("Erro ao responder à oferta"),
  });
}
