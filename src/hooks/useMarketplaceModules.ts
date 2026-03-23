import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketplaceModule {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  cover_image: string | null;
  pricing_model: string;
  price_eur: number;
  min_plan: string;
  stripe_price_id: string | null;
  is_featured: boolean | null;
  is_new: boolean | null;
  installs_count: number | null;
  rating: number | null;
  version: string;
  status: string;
}

export function useMarketplaceModules(category?: string) {
  return useQuery({
    queryKey: ["marketplace-modules", category],
    queryFn: async (): Promise<MarketplaceModule[]> => {
      let query = supabase
        .from("marketplace_modules")
        .select("id, slug, name, tagline, description, category, icon, cover_image, pricing_model, price_eur, min_plan, stripe_price_id, is_featured, is_new, installs_count, rating, version, status")
        .in("status", ["active", "published"])
        .order("is_featured", { ascending: false })
        .order("name");

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as MarketplaceModule[]) || [];
    },
    staleTime: 5 * 60_000,
  });
}
