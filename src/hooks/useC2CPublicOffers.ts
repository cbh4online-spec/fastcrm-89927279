import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePublicOfferInput {
  workspace_id: string;
  listing_id: string;
  seller_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  offered_price: number;
  original_price: number;
  currency: string;
  message?: string;
}

export function useCreateC2CPublicOffer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePublicOfferInput) => {
      const { data, error } = await supabase
        .from("c2c_public_offers" as any)
        .insert({
          workspace_id: input.workspace_id,
          listing_id: input.listing_id,
          seller_id: input.seller_id,
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_phone: input.customer_phone || null,
          offered_price: input.offered_price,
          original_price: input.original_price,
          currency: input.currency,
          message: input.message || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Notify seller
      await supabase.from("c2c_notifications").insert({
        workspace_id: input.workspace_id,
        user_id: input.seller_id,
        type: "new_offer",
        title: "Nova oferta recebida",
        body: `${input.customer_name} ofereceu ${input.offered_price.toFixed(2)} € pelo seu anúncio`,
        listing_id: input.listing_id,
      });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["c2c-public-offers"] });
      qc.invalidateQueries({ queryKey: ["c2c-notifications"] });
      toast.success("Oferta enviada com sucesso!");
    },
    onError: () => toast.error("Erro ao enviar oferta. Tente novamente."),
  });
}
