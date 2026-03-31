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
  gmv: number;
  totalCommission: number;
  payoutPending: number;
  c2cShare: number;
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

export interface TopSeller {
  seller_id: string;
  display_name: string;
  gmv: number;
  orders: number;
  commission: number;
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

      // Fetch marketplace_orders for GMV + commission
      const { data: mkOrders = [] } = await sb
        .from("marketplace_orders")
        .select("id, gross_amount, commission_amount, net_amount, status, created_at")
        .eq("workspace_id", workspaceId);

      const paidOrders = (mkOrders || []).filter((o: any) => o.status === "paid");
      const gmv = paidOrders.reduce((s: number, o: any) => s + Number(o.gross_amount || 0), 0);
      const totalCommission = paidOrders.reduce((s: number, o: any) => s + Number(o.commission_amount || 0), 0);

      // Month revenue from marketplace_orders
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthOrders = paidOrders.filter((o: any) => new Date(o.created_at) >= startOfMonth);
      const monthRevenue = monthOrders.reduce((s: number, o: any) => s + Number(o.gross_amount || 0), 0);

      // Payout pending
      const { data: payouts = [] } = await sb
        .from("marketplace_payouts")
        .select("amount, status")
        .eq("workspace_id", workspaceId)
        .in("status", ["requested", "approved"]);
      const payoutPending = (payouts || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

      // C2C share: compare marketplace_orders vs total store_orders
      const { count: totalStoreOrders } = await sb
        .from("store_orders")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      const c2cShare = (totalStoreOrders || 0) > 0
        ? ((mkOrders || []).length / (totalStoreOrders || 1)) * 100
        : 0;

      // Offers count for conversion
      const { count: offersCount } = await sb
        .from("c2c_offers")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

      const conversionRate = totalViews > 0 ? ((offersCount || 0) / totalViews) * 100 : 0;

      return {
        activeListings: active,
        soldListings: sold,
        totalViews,
        totalOrders: paidOrders.length,
        monthRevenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
        gmv,
        totalCommission,
        payoutPending,
        c2cShare: Math.round(c2cShare * 100) / 100,
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
        .from("marketplace_orders")
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

export function useTopSellers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-top-sellers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data: mkOrders = [] } = await sb
        .from("marketplace_orders")
        .select("seller_id, gross_amount, commission_amount, status")
        .eq("workspace_id", workspaceId)
        .eq("status", "paid");

      // Get all sellers
      const sellerIds = [...new Set((mkOrders || []).map((o: any) => o.seller_id))];
      if (sellerIds.length === 0) return [];

      const { data: sellers = [] } = await sb
        .from("c2c_sellers")
        .select("id, display_name")
        .in("id", sellerIds);

      const sellerMap = new Map((sellers || []).map((s: any) => [s.id, s.display_name]));

      // Aggregate by seller
      const agg = new Map<string, { gmv: number; orders: number; commission: number }>();
      for (const o of mkOrders || []) {
        const prev = agg.get(o.seller_id) || { gmv: 0, orders: 0, commission: 0 };
        prev.gmv += Number(o.gross_amount || 0);
        prev.commission += Number(o.commission_amount || 0);
        prev.orders++;
        agg.set(o.seller_id, prev);
      }

      return [...agg.entries()]
        .map(([seller_id, stats]) => ({
          seller_id,
          display_name: sellerMap.get(seller_id) || seller_id.slice(0, 8),
          ...stats,
        }))
        .sort((a, b) => b.gmv - a.gmv)
        .slice(0, 10) as TopSeller[];
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
