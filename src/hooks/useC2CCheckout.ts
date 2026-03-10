import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface C2CCheckoutParams {
  listingId: string;
  workspaceId: string;
  buyerEmail?: string;
  buyerName?: string;
  shippingMethod?: string;
  shippingPrice?: number;
  shippingCarrier?: string;
  meetupLocation?: string;
}

export function useC2CCheckout() {
  return useMutation({
    mutationFn: async (params: C2CCheckoutParams) => {
      const { data, error } = await supabase.functions.invoke("create-c2c-checkout", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao iniciar checkout");
    },
  });
}
