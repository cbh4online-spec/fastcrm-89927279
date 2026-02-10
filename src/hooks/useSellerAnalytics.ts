import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerAnalytics {
  totalSales: number;
  totalRevenue: number;
  totalCommissions: number;
  sellerEarnings: number;
  avgRating: number;
  totalReviews: number;
  activeListings: number;
  soldListings: number;
  activeBoosts: number;
  monthlySales: { month: string; sales: number; revenue: number }[];
}

export function useSellerAnalytics(workspaceId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["c2c-seller-analytics", workspaceId, user?.id],
    queryFn: async (): Promise<SellerAnalytics> => {
      if (!workspaceId || !user) throw new Error("Missing data");

      // Get seller profile
      const { data: seller } = await supabase
        .from("c2c_sellers")
        .select("id, total_sales, total_revenue, avg_rating, total_reviews")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .single();

      if (!seller) throw new Error("Vendedor não encontrado");

      // Get commissions
      const { data: commissions } = await supabase
        .from("c2c_commissions")
        .select("sale_amount, commission_amount, seller_amount, created_at")
        .eq("seller_id", seller.id)
        .eq("workspace_id", workspaceId);

      const totalCommissions = (commissions || []).reduce((s, c) => s + Number(c.commission_amount), 0);
      const sellerEarnings = (commissions || []).reduce((s, c) => s + Number(c.seller_amount), 0);

      // Get listing counts
      const { count: activeListings } = await supabase
        .from("c2c_listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("workspace_id", workspaceId)
        .eq("status", "active");

      const { count: soldListings } = await supabase
        .from("c2c_listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("workspace_id", workspaceId)
        .eq("status", "sold");

      // Active boosts
      const now = new Date().toISOString();
      const { count: activeBoosts } = await supabase
        .from("c2c_sponsored_listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", seller.id)
        .eq("is_active", true)
        .gte("ends_at", now);

      // Monthly sales (last 6 months)
      const monthlySales: { month: string; sales: number; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const monthComms = (commissions || []).filter(
          (c) => c.created_at >= start && c.created_at <= end
        );
        monthlySales.push({
          month: d.toLocaleDateString("pt-PT", { month: "short" }),
          sales: monthComms.length,
          revenue: monthComms.reduce((s, c) => s + Number(c.seller_amount), 0),
        });
      }

      return {
        totalSales: seller.total_sales || 0,
        totalRevenue: Number(seller.total_revenue || 0),
        totalCommissions,
        sellerEarnings,
        avgRating: Number(seller.avg_rating || 0),
        totalReviews: seller.total_reviews || 0,
        activeListings: activeListings || 0,
        soldListings: soldListings || 0,
        activeBoosts: activeBoosts || 0,
        monthlySales,
      };
    },
    enabled: !!workspaceId && !!user,
  });
}
