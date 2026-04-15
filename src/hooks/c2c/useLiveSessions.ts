import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";
import type { Tables } from "@/integrations/supabase/types";

export type LiveSession = Tables<"live_sessions"> & {
  seller_name?: string;
  seller_avatar?: string;
};

export type LiveProduct = Tables<"live_products">;
export type LiveOrder = Tables<"live_orders">;
export type LiveChatMessage = Tables<"live_chat_messages"> & {
  user_name?: string;
  user_avatar?: string;
};

// ─── Live Sessions ───

export function useLiveSessions(workspaceId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`live-sessions-${workspaceId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_sessions",
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-sessions", workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

  return useQuery({
    queryKey: ["live-sessions", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .in("status", ["scheduled", "live", "ended"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      if (!data?.length) return [] as LiveSession[];

      const sellerIds = [...new Set(data.map((l) => l.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", sellerIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      return data.map((l) => ({
        ...l,
        seller_name: profileMap.get(l.seller_id)?.full_name || "Vendedor",
        seller_avatar: profileMap.get(l.seller_id)?.avatar_url || undefined,
      })) as LiveSession[];
    },
  });
}

export function useLiveSessionById(id?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`live-session-${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_sessions",
        filter: `id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-session", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

  return useQuery({
    queryKey: ["live-session", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.seller_id)
        .maybeSingle();

      return {
        ...data,
        seller_name: profile?.full_name || "Vendedor",
        seller_avatar: profile?.avatar_url || undefined,
      } as LiveSession;
    },
  });
}

export function useCreateLiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      title: string;
      description?: string;
      type?: string;
      thumbnail_url?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const roomName = `live_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

      const { data, error } = await supabase
        .from("live_sessions")
        .insert({
          workspace_id: input.workspace_id,
          seller_id: user.id,
          title: input.title,
          description: input.description || null,
          type: input.type || "open",
          thumbnail_url: input.thumbnail_url || null,
          livekit_room_name: roomName,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LiveSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-sessions"] });
    },
  });
}

export function useStartLiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("live_sessions")
        .update({ status: "live", started_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("seller_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["live-session"] });
    },
  });
}

export function useEndLiveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("live_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("seller_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["live-session"] });
    },
  });
}

// ─── Live Products ───

export function useLiveProducts(sessionId?: string) {
  return useQuery({
    queryKey: ["live-products", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_products")
        .select("*, products(id, name, price, image_url, images)")
        .eq("live_session_id", sessionId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAddLiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { live_session_id: string; product_id: string; order_index?: number }) => {
      const { error } = await supabase
        .from("live_products")
        .insert(input);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["live-products", vars.live_session_id] });
    },
  });
}

export function useSetFeaturedProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, productId }: { sessionId: string; productId: string }) => {
      // Unfeatured all first
      await supabase
        .from("live_products")
        .update({ is_featured: false, featured_at: null })
        .eq("live_session_id", sessionId);

      // Feature this one
      const { error } = await supabase
        .from("live_products")
        .update({ is_featured: true, featured_at: new Date().toISOString() })
        .eq("live_session_id", sessionId)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["live-products", vars.sessionId] });
    },
  });
}

// ─── Live Chat Messages ───

export function useLiveChatMessages(sessionId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`live-chat-${sessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `live_session_id=eq.${sessionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["live-chat-messages", sessionId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey: ["live-chat-messages", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_chat_messages")
        .select("*")
        .eq("live_session_id", sessionId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;

      if (!data?.length) return [] as LiveChatMessage[];

      const userIds = [...new Set(data.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      return data.map((m) => ({
        ...m,
        user_name: profileMap.get(m.user_id)?.full_name || "Utilizador",
        user_avatar: profileMap.get(m.user_id)?.avatar_url || undefined,
      })) as LiveChatMessage[];
    },
  });
}

export function useSendLiveChatMessage() {
  return useMutation({
    mutationFn: async (input: { live_session_id: string; message: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Faz login para enviar mensagens");
      const { error } = await supabase
        .from("live_chat_messages")
        .insert({
          live_session_id: input.live_session_id,
          user_id: user.id,
          message: input.message,
        });
      if (error) throw error;
    },
  });
}

// ─── Live Orders ───

export function useLiveOrders(sessionId?: string) {
  return useQuery({
    queryKey: ["live-orders", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_orders")
        .select("*")
        .eq("live_session_id", sessionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateLiveOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      live_session_id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("live_orders")
        .insert({
          ...input,
          buyer_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["live-orders", vars.live_session_id] });
    },
  });
}

// ─── LiveKit Token ───

export function useGenerateLiveKitToken() {
  return useMutation({
    mutationFn: async (input: {
      room_name: string;
      participant_identity: string;
      participant_name: string;
      is_publisher: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("generate-livekit-token", {
        body: input,
      });
      if (error) throw error;
      return data as { token: string };
    },
  });
}

// ─── Track Viewer Count ───

export function useTrackLiveViewer(sessionId?: string, isLive?: boolean) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!sessionId || !isLive || tracked.current) return;
    tracked.current = true;

    // Best-effort increment
    supabase
      .from("live_sessions")
      .update({ viewer_count: undefined as any }) // handled by RPC ideally
      .eq("id", sessionId);

    return () => {
      tracked.current = false;
    };
  }, [sessionId, isLive]);
}
