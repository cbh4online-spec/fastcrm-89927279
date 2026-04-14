import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface PublicLivestream {
  id: string;
  workspace_id: string;
  workspace_slug: string | null;
  seller_id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended";
  thumbnail_url: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  total_views: number;
  category: string | null;
  tags: string[];
  created_at: string;
  seller_name?: string;
  seller_avatar?: string;
}

export function usePublicLivestreams(workspaceId?: string) {
  return useQuery({
    queryKey: ["c2c-public-livestreams", workspaceId],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: lives, error } = await sb
        .from("c2c_livestreams")
        .select("id, workspace_id, workspace_slug, seller_id, title, description, status, thumbnail_url, scheduled_at, started_at, ended_at, viewer_count, total_views, category, tags, created_at")
        .eq("workspace_id", workspaceId)
        .in("status", ["scheduled", "live", "ended"])
        .order("status", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      if (!lives?.length) return [] as PublicLivestream[];

      // Fetch seller profiles
      const sellerIds = [...new Set(lives.map((l: any) => l.seller_id))];
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", sellerIds);

      const profileMap = new Map<string, any>(
        (profiles || []).map((p: any) => [p.id, p])
      );

      return lives.map((l: any) => ({
        ...l,
        seller_name: profileMap.get(l.seller_id)?.display_name || "Vendedor",
        seller_avatar: profileMap.get(l.seller_id)?.avatar_url || null,
      })) as PublicLivestream[];
    },
  });
}
