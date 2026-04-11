import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface MarketplaceConfig {
  id?: string;
  workspace_id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  favicon_url?: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  og_image_url?: string;
  settings: {
    allowGuestBrowsing: boolean;
    requireLoginToContact: boolean;
    showSellerPhone?: boolean;
    showSellerEmail?: boolean;
    enableMessaging?: boolean;
    enableOffers: boolean;
    enableBoost: boolean;
    categoriesEnabled: boolean;
    searchEnabled: boolean;
    filtersEnabled: boolean;
  };
  commission_rate?: number;
  boost_price_day?: number;
  featured_price_week?: number;
  categories?: Array<{ id: string; name: string; icon: string; subcategories?: Array<{ id: string; name: string }> }>;
  support_email?: string;
  support_phone?: string;
  social_links?: Record<string, string>;
  status?: string;
  stats?: {
    totalListings: number;
    totalSellers: number;
  };
}

/** Fetch marketplace config by slug (public) — tries edge function, falls back to direct query */
export function useMarketplaceConfig(slug: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-config", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required");
      // Try direct query first (faster, no edge function needed)
      const { data: directData, error: directError } = await sb
        .from("c2c_marketplace_config")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (directData) return directData as MarketplaceConfig;
      // Fallback to edge function
      try {
        const { data, error } = await supabase.functions.invoke("get-marketplace-config", {
          body: { slug },
        });
        if (!error && data?.marketplace) return data.marketplace as MarketplaceConfig;
      } catch {}
      // Also try matching by workspace slug
      const { data: wsData } = await sb
        .from("c2c_marketplace_config")
        .select("*")
        .eq("workspace_id", (
          await supabase.from("workspaces").select("id").eq("slug", slug).maybeSingle()
        ).data?.id)
        .maybeSingle();
      return (wsData as MarketplaceConfig) || null;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch marketplace config for admin (by workspace_id) */
export function useMarketplaceAdmin(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["marketplace-admin-config", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await sb
        .from("c2c_marketplace_config")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data as MarketplaceConfig | null;
    },
    enabled: !!workspaceId,
  });
}

/** Upsert marketplace config */
export function useSaveMarketplaceConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<MarketplaceConfig> & { workspace_id: string }) => {
      const { data, error } = await sb
        .from("c2c_marketplace_config")
        .upsert(
          { ...config, updated_at: new Date().toISOString() },
          { onConflict: "workspace_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["marketplace-admin-config"] });
      qc.invalidateQueries({ queryKey: ["marketplace-config", data?.slug] });
    },
  });
}
