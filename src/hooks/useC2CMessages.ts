import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface C2CMessage {
  id: string;
  workspace_id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface C2CConversation {
  listing_id: string;
  listing_title: string;
  other_user_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
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

      // Group by listing + other user
      const convMap = new Map<string, C2CConversation>();
      for (const msg of (data as C2CMessage[])) {
        const otherUser = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const key = `${msg.listing_id}:${otherUser}`;
        if (!convMap.has(key)) {
          convMap.set(key, {
            listing_id: msg.listing_id,
            listing_title: "",
            other_user_id: otherUser,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
        const conv = convMap.get(key)!;
        if (!msg.is_read && msg.receiver_id === user.id) {
          conv.unread_count++;
        }
      }

      // Fetch listing titles
      const listingIds = [...new Set([...convMap.values()].map(c => c.listing_id))];
      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from("c2c_listings")
          .select("id, title")
          .in("id", listingIds);
        const titleMap = new Map((listings || []).map(l => [l.id, l.title]));
        for (const conv of convMap.values()) {
          conv.listing_title = titleMap.get(conv.listing_id) || "Anúncio removido";
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

  // Realtime subscription
  useEffect(() => {
    if (!listingId || !user) return;
    const channel = supabase
      .channel(`c2c-messages-${listingId}`)
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
    }: {
      listingId: string;
      receiverId: string;
      content: string;
    }) => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { error } = await supabase.from("c2c_messages").insert({
        workspace_id: workspaceId,
        listing_id: listingId,
        sender_id: user.id,
        receiver_id: receiverId,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-thread"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-conversations"] });
    },
  });
}
