import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export function useCheckoutOffers(offerType?: string) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const offers = useQuery({
    queryKey: ["checkout-offers", wid, offerType],
    queryFn: async () => {
      let q = sb.from("checkout_offers").select("*").eq("workspace_id", wid).order("created_at", { ascending: false });
      if (offerType) q = q.eq("offer_type", offerType);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!wid,
  });

  const createOffer = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb.from("checkout_offers").insert({ ...payload, workspace_id: wid }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkout-offers"] }); toast.success("Oferta criada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateOffer = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { data, error } = await sb.from("checkout_offers").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkout-offers"] }); toast.success("Oferta atualizada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOffer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("checkout_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checkout-offers"] }); toast.success("Oferta eliminada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { offers, createOffer, updateOffer, deleteOffer };
}
