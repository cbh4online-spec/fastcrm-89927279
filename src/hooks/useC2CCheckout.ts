import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface C2CCheckoutParams {
  listingId: string;
  workspaceId: string;
  buyerEmail?: string;
  buyerName?: string;
}

export function useC2CCheckout() {
  return useMutation({
    mutationFn: async ({ listingId, workspaceId, buyerEmail, buyerName }: C2CCheckoutParams) => {
      const { data, error } = await supabase.functions.invoke("create-c2c-checkout", {
        body: { listingId, workspaceId, buyerEmail, buyerName },
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
