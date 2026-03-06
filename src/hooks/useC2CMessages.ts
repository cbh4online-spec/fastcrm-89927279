import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface C2CMessage {
  id: string;
  workspace_id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  metadata: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
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

      // Fetch all messages where the current user is either the sender or the receiver
      const { data: sentMessages, error: sentError } = await supabase
        .from("c2c_messages")
        .select("listing_id, receiver_id, created_at")
        .eq("workspace_id", workspaceId)
        .eq("sender_id", user.id);

      const { data: receivedMessages, error: receivedError } = await supabase
        .from("c2c_messages")
        .select("listing_id, sender_id, created_at")
        .eq("workspace_id", workspaceId)
        .eq("receiver_id", user.id);

      if (sentError || receivedError) {
        console.error("Error fetching messages:", sentError, receivedError);
        throw new Error("Failed to fetch messages");
      }

      // Process sent messages
      const sent = (sentMessages || []).map((msg) => ({
        listingId: msg.listing_id,
        otherUserId: msg.receiver_id,
        lastMessageAt: msg.created_at,
      }));

      // Process received messages
      const received = (receivedMessages || []).map((msg) => ({
        listingId: msg.listing_id,
        otherUserId: msg.sender_id,
        lastMessageAt: msg.created_at,
      }));

      // Combine and normalize conversations
      const combined = [...sent, ...received];
      const conversationsMap: Record<string, any> = {};

      combined.forEach((item) => {
        const key = `${item.listingId}-${item.otherUserId}`;
        if (!conversationsMap[key]) {
          conversationsMap[key] = {
            listingId: item.listingId,
            otherUserId: item.otherUserId,
            lastMessageAt: item.lastMessageAt,
          };
        } else {
          // Use the most recent message
          conversationsMap[key].lastMessageAt =
            item.lastMessageAt > conversationsMap[key].lastMessageAt
              ? item.lastMessageAt
              : conversationsMap[key].lastMessageAt;
        }
      });

      // Convert map to array and sort by lastMessageAt
      let conversations = Object.values(conversationsMap).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      // Fetch additional data for each conversation
      conversations = await Promise.all(
        conversations.map(async (c) => {
          const { data: listing } = await supabase
            .from("c2c_listings")
            .select("title, photos")
            .eq("id", c.listingId)
            .single();

          const { data: otherUser } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", c.otherUserId)
            .single();

          return {
            ...c,
            listingTitle: listing?.title,
            listingPhoto: listing?.photos?.[0],
            otherUserName: (otherUser as any)?.full_name,
            otherUserAvatar: (otherUser as any)?.avatar_url,
          };
        })
      );

      return conversations;
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
    console.log('[MARKETPLACE] Realtime subscribe', { listingId });
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

    return () => {
      console.log('[MARKETPLACE] Realtime unsubscribe', { listingId });
      supabase.removeChannel(channel);
    };
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
      const { data, error } = await supabase.from("c2c_messages").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        metadata,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
      console.log('[MARKETPLACE] Message sent', { listing_id: vars.listingId });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "MARKETPLACE.MESSAGE_SENT",
          entity_kind: "c2c_message",
          entity_id: data?.id || vars.listingId,
          source_module: "store-marketplace",
          payload: { listing_id: vars.listingId, message_type: vars.messageType || "text" },
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[MARKETPLACE] MESSAGE_SEND_FAILED', err.message);
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
    onSuccess: (offer, vars) => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-offers"] });
      toast.success("Proposta enviada!");
      console.log('[MARKETPLACE] Offer sent', { offer_id: offer.id, listing_id: vars.listingId });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "MARKETPLACE.OFFER_SENT",
          entity_kind: "c2c_offer",
          entity_id: offer.id,
          source_module: "store-marketplace",
          payload: { listing_id: vars.listingId, offer_price: vars.offerPrice },
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[MARKETPLACE] OFFER_SEND_FAILED', err.message);
      toast.error("Erro ao enviar proposta");
    },
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

      return { offerId, action, listingId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-offers"] });
      toast.success("Resposta enviada!");
      console.log('[MARKETPLACE] Offer responded', { offer_id: result.offerId, action: result.action });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "MARKETPLACE.OFFER_RESPONDED",
          entity_kind: "c2c_offer",
          entity_id: result.offerId,
          source_module: "store-marketplace",
          payload: { action: result.action, listing_id: result.listingId },
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[MARKETPLACE] OFFER_RESPOND_FAILED', err.message);
      toast.error("Erro ao responder");
    },
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

      return { listingId, newStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-listings"] });
      toast.success("Estado atualizado!");
      console.log('[MARKETPLACE] Listing status changed', { listing_id: result.listingId, new_status: result.newStatus });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "LISTING.STATUS_CHANGED",
          entity_kind: "c2c_listing",
          entity_id: result.listingId,
          source_module: "store-marketplace",
          payload: { new_status: result.newStatus, listing_id: result.listingId },
        });
      }
    },
    onError: (err: Error) => {
      console.warn('[MARKETPLACE] LISTING_STATUS_UPDATE_FAILED', err.message);
      toast.error("Erro ao atualizar estado");
    },
  });
}
