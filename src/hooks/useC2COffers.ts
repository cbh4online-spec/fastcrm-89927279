import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface C2COffer {
  id: string;
  workspace_id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  counter_price: number | null;
  status: "pending" | "accepted" | "rejected" | "countered" | "expired";
  message: string | null;
  created_at: string;
  updated_at: string;
}

export function useListingOffers(listingId: string | undefined) {
  return useQuery({
    queryKey: ["c2c-offers", "listing", listingId],
    queryFn: async () => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from("c2c_offers")
        .select("*")
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as C2COffer[];
    },
    enabled: !!listingId,
  });
}

export function useMyOffers(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-offers", "my", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("c2c_offers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as C2COffer[];
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useReceivedOffers(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-offers", "received", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("c2c_offers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as C2COffer[];
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useCreateOffer(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      listingId,
      sellerId,
      offerPrice,
      message,
    }: {
      listingId: string;
      sellerId: string;
      offerPrice: number;
      message?: string;
    }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("c2c_offers")
        .insert({
          workspace_id: workspaceId,
          listing_id: listingId,
          buyer_id: user.id,
          seller_id: sellerId,
          offer_price: offerPrice,
          message: message || null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      // Create notification for seller
      await supabase.from("c2c_notifications").insert({
        workspace_id: workspaceId,
        user_id: sellerId,
        type: "new_offer",
        title: "Nova oferta recebida",
        body: `Recebeste uma oferta de ${offerPrice.toFixed(2)} €`,
        listing_id: listingId,
        related_user_id: user.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-offers"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-notifications"] });
      toast.success("Oferta enviada!");
    },
    onError: () => toast.error("Erro ao enviar oferta"),
  });
}

export function useRespondToOffer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      offerId,
      action,
      counterPrice,
      workspaceId,
      buyerId,
      listingId,
    }: {
      offerId: string;
      action: "accepted" | "rejected" | "countered";
      counterPrice?: number;
      workspaceId: string;
      buyerId: string;
      listingId: string;
    }) => {
      if (!user) throw new Error("Sem sessão");
      const updates: Record<string, unknown> = { status: action, updated_at: new Date().toISOString() };
      if (action === "countered" && counterPrice) {
        updates.counter_price = counterPrice;
      }

      const { error } = await supabase
        .from("c2c_offers")
        .update(updates)
        .eq("id", offerId);
      if (error) throw error;

      // Notify buyer
      const typeMap = { accepted: "offer_accepted", rejected: "offer_rejected", countered: "new_offer" };
      const titleMap = {
        accepted: "Oferta aceite!",
        rejected: "Oferta recusada",
        countered: `Contraproposta: ${counterPrice?.toFixed(2)} €`,
      };
      await supabase.from("c2c_notifications").insert({
        workspace_id: workspaceId,
        user_id: buyerId,
        type: typeMap[action],
        title: titleMap[action],
        body: action === "countered" ? `O vendedor fez uma contraproposta de ${counterPrice?.toFixed(2)} €` : undefined,
        listing_id: listingId,
        related_user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-offers"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-notifications"] });
      toast.success("Resposta enviada!");
    },
    onError: () => toast.error("Erro ao responder à oferta"),
  });
}
