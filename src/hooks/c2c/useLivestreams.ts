import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

export interface Livestream {
  id: string;
  workspace_id: string;
  seller_id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended" | "cancelled";
  thumbnail_url: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  peak_viewers: number;
  total_views: number;
  product_ids: string[];
  category: string | null;
  tags: string[];
  replay_available: boolean;
  created_at: string;
  updated_at: string;
  // joined from profiles
  seller_name?: string;
  seller_avatar?: string;
}

export interface LivestreamMessage {
  id: string;
  livestream_id: string;
  user_id: string;
  message: string;
  message_type: "chat" | "system" | "product_highlight" | "pinned";
  is_pinned: boolean;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

const sb = supabase as any;

export function useLivestreams(workspaceId?: string) {
  const queryClient = useQueryClient();

  // Realtime: auto-refresh when any livestream changes (status, viewer_count, etc.)
  useEffect(() => {
    if (!workspaceId) return;
    const channel = supabase
      .channel(`lives-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "c2c_livestreams",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["c2c-livestreams", workspaceId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

  return useQuery({
    queryKey: ["c2c-livestreams", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      // Fetch livestreams
      const { data: lives, error } = await sb
        .from("c2c_livestreams")
        .select("*")
        .eq("workspace_id", workspaceId)
        .in("status", ["scheduled", "live"])
        .order("status", { ascending: false })
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      if (!lives?.length) return [] as Livestream[];

      // Fetch seller profiles for each unique seller
      const sellerIds = [...new Set(lives.map((l: any) => l.seller_id))];
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", sellerIds);

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p])
      );

      return lives.map((l: any) => ({
        ...l,
        seller_name: profileMap.get(l.seller_id)?.display_name || "Vendedor",
        seller_avatar: profileMap.get(l.seller_id)?.avatar_url || null,
      })) as Livestream[];
    },
  });
}

export function useLivestreamById(id?: string) {
  return useQuery({
    queryKey: ["c2c-livestream", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("c2c_livestreams")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Livestream | null;
    },
  });
}

export function useLivestreamMessages(livestreamId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!livestreamId) return;
    const channel = supabase
      .channel(`live-chat-${livestreamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "c2c_livestream_messages",
          filter: `livestream_id=eq.${livestreamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["c2c-livestream-messages", livestreamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [livestreamId, queryClient]);

  return useQuery({
    queryKey: ["c2c-livestream-messages", livestreamId],
    enabled: !!livestreamId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("c2c_livestream_messages")
        .select("*")
        .eq("livestream_id", livestreamId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as LivestreamMessage[];
    },
  });
}

export function useCreateLivestream() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspace_id: string;
      title: string;
      description?: string;
      scheduled_at?: string;
      category?: string;
      tags?: string[];
      thumbnail_url?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await sb
        .from("c2c_livestreams")
        .insert({ ...input, seller_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Livestream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-livestreams"] });
    },
  });
}

export function useGoLive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (livestreamId: string) => {
      const { error } = await sb
        .from("c2c_livestreams")
        .update({ status: "live", started_at: new Date().toISOString() })
        .eq("id", livestreamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-livestreams"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-livestream"] });
    },
  });
}

export function useEndLive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (livestreamId: string) => {
      const { error } = await sb
        .from("c2c_livestreams")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", livestreamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-livestreams"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-livestream"] });
    },
  });
}

export function useSendLiveMessage() {
  return useMutation({
    mutationFn: async (input: { livestream_id: string; message: string; message_type?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await sb
        .from("c2c_livestream_messages")
        .insert({
          livestream_id: input.livestream_id,
          user_id: user.id,
          message: input.message,
          message_type: input.message_type || "chat",
        });
      if (error) throw error;
    },
  });
}
