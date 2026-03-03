import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface MarketplaceModuleAdmin {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
  status: string;
  tagline: string;
  description: string;
  pricing: Json;
  is_featured: boolean | null;
  is_new: boolean | null;
  installs_count: number | null;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface ModulePricing {
  base_price?: number;
  trial_days?: number;
  currency?: string;
  [key: string]: unknown;
}

function parsePricing(pricing: Json): ModulePricing {
  if (typeof pricing === "object" && pricing !== null && !Array.isArray(pricing)) {
    return pricing as unknown as ModulePricing;
  }
  return {};
}

export function useMarketplaceModulesAdmin() {
  const queryClient = useQueryClient();
  const queryKey = ["marketplace-modules-admin"];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_modules")
        .select("id, name, slug, icon, category, status, tagline, description, pricing, is_featured, is_new, installs_count, version, created_at, updated_at")
        .order("name");

      if (error) throw error;
      return data as MarketplaceModuleAdmin[];
    },
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase
        .from("marketplace_modules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["marketplace-modules"] });
      toast.success("Módulo atualizado!");
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar: " + err.message);
    },
  });

  const syncToLandingPage = useMutation({
    mutationFn: async (modules: MarketplaceModuleAdmin[]) => {
      for (const mod of modules) {
        const pricing = parsePricing(mod.pricing);
        const { error } = await supabase
          .from("platform_pricing_config")
          .upsert(
            {
              config_type: "module",
              config_key: mod.slug,
              name: mod.name,
              description: mod.tagline,
              price_monthly: pricing.base_price ?? 0,
              price_yearly: (pricing.base_price ?? 0) * 10,
              currency: pricing.currency || "EUR",
              is_active: mod.status === "published",
              is_highlighted: mod.is_featured ?? false,
              features: [] as unknown as Json,
              highlights: [] as unknown as Json,
              metadata: { icon: mod.icon, category: mod.category } as unknown as Json,
              display_order: 0,
            },
            { onConflict: "config_type,config_key" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-pricing-configs"] });
      toast.success("Preços sincronizados para a Landing Page!");
    },
    onError: (err: Error) => {
      toast.error("Erro ao sincronizar: " + err.message);
    },
  });

  return {
    modules: query.data ?? [],
    isLoading: query.isLoading,
    updateModule,
    syncToLandingPage,
    parsePricing,
  };
}
