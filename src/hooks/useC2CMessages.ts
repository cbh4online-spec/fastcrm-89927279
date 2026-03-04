import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";

export interface C2CMessage {
  id: string;
  workspace_id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  message_type: "text" | "system" | "offer" | "image";
  metadata: Record<string, unknown>;
}

export interface C2CListingInfo {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  status: string;
  condition: string;
  location: string | null;
  photos: string[] | null;
  seller_id: string;
  category_id: string | null;
}

export interface C2CConversation {
  listing_id: string;
  listing_title: string;
  listing_photo: string | null;
  listing_price: number;
  listing_currency: string | null;
  listing_status: string;
  listing_condition: string;
  listing_location: string | null;
  listing_seller_id: string;
  other_user_id: string;
  last_message: string;
  last_message_at: string;
  last_message_type: string;
  unread_count: number;
  has_pending_offer: boolean;
}

export function useC2CConversations(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-conversations", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("c2c_messages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const convMap = new Map<string, C2CConversation>();
      for (const msg of (data as C2CMessage[])) {
        const otherUser = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.listing_id}:${otherUser}`;
        if (!convMap.has(key)) {
          convMap.set(key, {
            listing_id: msg.listing_id,
            listing_title: "",
            listing_photo: null,
            listing_price: 0,
            listing_currency: "EUR",
            listing_status: "active",
            listing_condition: "used",
            listing_location: null,
            listing_seller_id: "",
            other_user_id: otherUser,
            last_message: msg.content,
            last_message_at: msg.created_at,
            last_message_type: (msg as any).message_type || "text",
            unread_count: 0,
            has_pending_offer: false,
          });
        }
        const conv = convMap.get(key)!;
        if (!msg.is_read && msg.receiver_id === user.id) {
          conv.unread_count++;
        }
      }

      // Fetch listing details
      const listingIds = [...new Set([...convMap.values()].map(c => c.listing_id))];
      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from("c2c_listings")
          .select("id, title, price, currency, status, condition, location, photos, seller_id")
          .in("id", listingIds);
        const listingMap = new Map((listings || []).map(l => [l.id, l]));
        for (const conv of convMap.values()) {
          const listing = listingMap.get(conv.listing_id);
          if (listing) {
            conv.listing_title = listing.title;
            conv.listing_photo = listing.photos?.[0] || null;
            conv.listing_price = listing.price;
            conv.listing_currency = listing.currency;
            conv.listing_status = listing.status;
            conv.listing_condition = listing.condition;
            conv.listing_location = listing.location;
            conv.listing_seller_id = listing.seller_id;
          } else {
            conv.listing_title = "Anúncio removido";
          }
        }
      }

      // Check pending offers
      if (listingIds.length > 0) {
        const { data: offers } = await supabase
          .from("c2c_offers")
          .select("listing_id, buyer_id, seller_id, status")
          .in("listing_id", listingIds)
          .eq("status", "pending");
        for (const offer of (offers || [])) {
          for (const conv of convMap.values()) {
            if (conv.listing_id === offer.listing_id &&
              (conv.other_user_id === offer.buyer_id || conv.other_user_id === offer.seller_id)) {
              conv.has_pending_offer = true;
            }
          }
        }
      }

      return [...convMap.values()].sort((a, b) =>
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useC2CThread(listingId: string | undefined, otherUserId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["c2c-thread", listingId, otherUserId],
    queryFn: async () => {
      if (!listingId || !otherUserId || !user) return [];
      const { data, error } = await supabase
        .from("c2c_messages")
        .select("*")
        .eq("listing_id", listingId)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Mark unread as read
      const unreadIds = (data as C2CMessage[])
        .filter(m => !m.is_read && m.receiver_id === user.id)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("c2c_messages")
          .update({ is_read: true })
          .in("id", unreadIds);
      }

      return data as C2CMessage[];
    },
    enabled: !!listingId && !!otherUserId && !!user,
  });

  // Realtime subscription for messages + offers
  useEffect(() => {
    if (!listingId || !user) return;
    const channel = supabase
      .channel(`c2c-inbox-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "c2c_messages",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["c2c-thread", listingId, otherUserId] });
          queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "c2c_offers",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["c2c-offers", "listing", listingId] });
          queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [listingId, otherUserId, user, queryClient]);

  return query;
}

export function useSendC2CMessage(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      listingId,
      receiverId,
      content,
      messageType = "text",
      metadata = {},
    }: {
      listingId: string;
      receiverId: string;
      content: string;
      messageType?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { error } = await supabase.from("c2c_messages").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        metadata,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
    },
  });
}

export function useSendC2COfferMessage(workspaceId: string | undefined) {
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

      // Create offer
      const { data: offer, error: offerError } = await supabase
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
      if (offerError) throw offerError;

      // Insert offer message
      await supabase.from("c2c_messages").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: sellerId,
        content: `Proposta: ${offerPrice.toFixed(2)} €`,
        message_type: "offer",
        metadata: {
          offer_id: offer.id,
          offer_price: offerPrice,
          offer_status: "pending",
        },
      } as any);

      // Notification
      await supabase.from("c2c_notifications").insert({
        workspace_id: workspaceId,
        user_id: sellerId,
        type: "new_offer",
        title: "Nova proposta recebida",
        body: `Recebeste uma proposta de ${offerPrice.toFixed(2)} €`,
        listing_id: listingId,
        related_user_id: user.id,
      });

      return offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-offers"] });
      toast.success("Proposta enviada!");
    },
    onError: () => toast.error("Erro ao enviar proposta"),
  });
}

export function useRespondToOfferInChat(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      offerId,
      action,
      counterPrice,
      buyerId,
      listingId,
    }: {
      offerId: string;
      action: "accepted" | "rejected" | "countered";
      counterPrice?: number;
      buyerId: string;
      listingId: string;
    }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");

      const updates: Record<string, unknown> = { status: action, updated_at: new Date().toISOString() };
      if (action === "countered" && counterPrice) {
        updates.counter_price = counterPrice;
      }

      const { error } = await supabase
        .from("c2c_offers")
        .update(updates)
        .eq("id", offerId);
      if (error) throw error;

      // System message
      const actionLabels: Record<string, string> = {
        accepted: "Proposta aceite ✅",
        rejected: "Proposta recusada ❌",
        countered: `Contraproposta: ${counterPrice?.toFixed(2)} € 🔄`,
      };

      await supabase.from("c2c_messages").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: buyerId,
        content: actionLabels[action],
        message_type: "system",
        metadata: {
          offer_id: offerId,
          offer_status: action,
          ...(counterPrice ? { offer_price: counterPrice } : {}),
        },
      } as any);

      // Notification
      const titleMap: Record<string, string> = {
        accepted: "Proposta aceite!",
        rejected: "Proposta recusada",
        countered: `Contraproposta: ${counterPrice?.toFixed(2)} €`,
      };
      await supabase.from("c2c_notifications").insert({
        workspace_id: workspaceId,
        user_id: buyerId,
        type: action === "accepted" ? "offer_accepted" : action === "rejected" ? "offer_rejected" : "new_offer",
        title: titleMap[action],
        listing_id: listingId,
        related_user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-offers"] });
      toast.success("Resposta enviada!");
    },
    onError: () => toast.error("Erro ao responder"),
  });
}

export function useUpdateListingStatusInChat(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      listingId,
      newStatus,
      otherUserId,
    }: {
      listingId: string;
      newStatus: "reserved" | "sold" | "active";
      otherUserId: string;
    }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");

      const { error } = await supabase
        .from("c2c_listings")
        .update({ status: newStatus })
        .eq("id", listingId);
      if (error) throw error;

      const labels: Record<string, string> = {
        reserved: "Anúncio marcado como reservado 🔒",
        sold: "Anúncio marcado como vendido 🛍️",
        active: "Anúncio reativado ✅",
      };

      await supabase.from("c2c_messages").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: labels[newStatus],
        message_type: "system",
        metadata: { listing_status: newStatus },
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-listings"] });
      toast.success("Estado atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar estado"),
  });
}
