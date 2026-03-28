import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface MarketplaceKPIs {
  activeListings: number;
  soldListings: number;
  totalViews: number;
  totalOrders: number;
  monthRevenue: number;
  conversionRate: number;
}

export interface WeeklyTrend {
  week: string;
  listings: number;
  sales: number;
}

export interface TopListing {
  id: string;
  title: string;
  price: number;
  views_count: number;
  photos: string[];
  status: string;
}

export function useMarketplaceKPIs(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-kpis", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      // Fetch all listings for this workspace
      const { data: listings = [], error: lErr } = await sb
        .from("c2c_listings")
        .select("id, status, views_count, price, created_at")
        .eq("workspace_id", workspaceId);
      if (lErr) throw lErr;

      const active = listings.filter((l: any) => l.status === "active").length;
      const sold = listings.filter((l: any) => l.status === "sold").length;
      const totalViews = listings.reduce((s: number, l: any) => s + (l.views_count || 0), 0);

      // Fetch orders this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: orders = [], error: oErr } = await sb
        .from("c2c_orders")
        .select("id, total_amount, created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", startOfMonth.toISOString());
      if (oErr) console.warn("Orders query error:", oErr);

      const monthRevenue = (orders || []).reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

      // Fetch offers count for conversion
      const { count: offersCount } = await sb
        .from("c2c_offers")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      const conversionRate = totalViews > 0 ? ((offersCount || 0) / totalViews) * 100 : 0;

      return {
        activeListings: active,
        soldListings: sold,
        totalViews,
        totalOrders: (orders || []).length,
        monthRevenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
      } as MarketplaceKPIs;
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useWeeklyTrends(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-weekly-trends", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

      const { data: listings = [] } = await sb
        .from("c2c_listings")
        .select("created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", twelveWeeksAgo.toISOString());

      const { data: orders = [] } = await sb
        .from("c2c_orders")
        .select("created_at")
        .eq("workspace_id", workspaceId)
        .gte("created_at", twelveWeeksAgo.toISOString());

      // Group by week
      const weeks: Record<string, { listings: number; sales: number }> = {};
      const getWeekKey = (d: Date) => {
        const start = new Date(d);
        start.setDate(start.getDate() - start.getDay());
        return start.toISOString().slice(0, 10);
      };

      (listings || []).forEach((l: any) => {
        const w = getWeekKey(new Date(l.created_at));
        if (!weeks[w]) weeks[w] = { listings: 0, sales: 0 };
        weeks[w].listings++;
      });

      (orders || []).forEach((o: any) => {
        const w = getWeekKey(new Date(o.created_at));
        if (!weeks[w]) weeks[w] = { listings: 0, sales: 0 };
        weeks[w].sales++;
      });

      return Object.entries(weeks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, data]) => ({ week, ...data })) as WeeklyTrend[];
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}

export function useTopListings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-top-listings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await sb
        .from("c2c_listings")
        .select("id, title, price, views_count, photos, status")
        .eq("workspace_id", workspaceId)
        .order("views_count", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as TopListing[];
    },
    enabled: !!workspaceId,
  });
}

/** Calculate trending score for a listing */
export function getTrendingScore(listing: { views_count: number; created_at: string; is_featured?: boolean }) {
  const daysSinceCreated = (Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const recencyBonus = Math.max(0, 14 - daysSinceCreated) * 3;
  const featuredBonus = listing.is_featured ? 20 : 0;
  return (listing.views_count || 0) + recencyBonus + featuredBonus;
}
