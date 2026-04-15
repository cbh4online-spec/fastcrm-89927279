import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { PublicLivestream } from "./usePublicLivestreams";

const sb = supabase as any;

/**
 * Fetches ALL live streams across all workspaces (global discovery).
 * Subscribes to realtime changes on c2c_livestreams.
 */
export function useGlobalLivestreams() {
  const qc = useQueryClient();

  // Realtime subscription — global (no workspace filter)
  useEffect(() => {
    const channel = supabase
      .channel("global-livestreams")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "c2c_livestreams" },
        () => {
          qc.invalidateQueries({ queryKey: ["global-livestreams"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["global-livestreams"],
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Fetch lives with status in (live, scheduled, ended) - ended limited to last 48h
      const cutoff48h = new Date(Date.now() - 48 * 3600_000).toISOString();

      const { data: lives, error } = await sb
        .from("c2c_livestreams")
        .select(
          "id, workspace_id, workspace_slug, seller_id, title, description, status, thumbnail_url, scheduled_at, started_at, ended_at, viewer_count, total_views, category, tags, created_at, product_ids"
        )
        .in("status", ["scheduled", "live", "ended"])
        .or(`status.neq.ended,ended_at.gte.${cutoff48h}`)
        .order("viewer_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!lives?.length) return [] as PublicLivestream[];

      // Fetch seller profiles
      const sellerIds = [...new Set(lives.map((l: any) => l.seller_id))];
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", sellerIds);

      const profileMap = new Map<string, any>(
        (profiles || []).map((p: any) => [p.id, p])
      );

      return lives.map((l: any) => ({
        ...l,
        seller_name: profileMap.get(l.seller_id)?.full_name || "Vendedor",
        seller_avatar: profileMap.get(l.seller_id)?.avatar_url || null,
      })) as PublicLivestream[];
    },
  });
}
