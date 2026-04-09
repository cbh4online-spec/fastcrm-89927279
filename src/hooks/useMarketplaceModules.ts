import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceModule, ModuleCategory, ModuleInternalType, ModuleStatus, ModulePricingType } from "@/types/marketplace";

export function useMarketplaceModules(category?: string) {
  return useQuery({
    queryKey: ["marketplace-modules", category],
    queryFn: async (): Promise<MarketplaceModule[]> => {
      let query = supabase
        .from("marketplace_modules")
        .select("*")
        .in("status", ["active", "published"])
        .order("is_featured", { ascending: false })
        .order("name");

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      return data.map((row): MarketplaceModule => {
        const pricing = (typeof row.pricing === "object" && row.pricing !== null && !Array.isArray(row.pricing))
          ? row.pricing as Record<string, unknown>
          : {};

        const permissions = (typeof row.permissions === "object" && row.permissions !== null && !Array.isArray(row.permissions))
          ? row.permissions as Record<string, unknown>
          : {};

        const embeddedConfig = (typeof row.embedded_config === "object" && row.embedded_config !== null && !Array.isArray(row.embedded_config))
          ? row.embedded_config as Record<string, unknown>
          : undefined;

        const expectedResults = Array.isArray(row.expected_results) ? row.expected_results as string[] : [];
        const useCases = Array.isArray(row.use_cases) ? row.use_cases as string[] : [];

        return {
          id: row.slug,
          slug: row.slug,
          name: row.name,
          tagline: row.tagline || "",
          description: row.description || "",
          category: (row.category || "ai") as ModuleCategory,
          icon: row.icon || "Package",
          cover_image: row.cover_image || undefined,
          target_audience: row.target_audience || "",
          expected_results: expectedResults,
          use_cases: useCases,
          internal_type: (row.internal_type || "native_feature") as ModuleInternalType,
          status: (row.status || "active") as ModuleStatus,
          version: row.version || "1.0.0",
          embedded_config: embeddedConfig as Record<string, unknown> | undefined,
          permissions: {
            data_permissions: Array.isArray(permissions['data_permissions']) ? permissions['data_permissions'] as string[] : [],
            workspace_isolation: (permissions['workspace_isolation'] as boolean) ?? true,
            can_send_emails: (permissions['can_send_emails'] as boolean) ?? false,
            can_send_whatsapp: (permissions['can_send_whatsapp'] as boolean) ?? false,
            can_create_activities: (permissions['can_create_activities'] as boolean) ?? false,
            can_trigger_automations: (permissions['can_trigger_automations'] as boolean) ?? false,
          },
          pricing: {
            type: ((pricing['type'] as string) || row.pricing_model || "free") as ModulePricingType,
            base_price: (pricing['base_price'] as number) ?? row.price_eur ?? 0,
            currency: (pricing['currency'] as string) || "EUR",
            usage_unit: pricing['usage_unit'] as string | undefined,
            price_per_unit: pricing['price_per_unit'] as number | undefined,
            included_units: pricing['included_units'] as number | undefined,
            credits_included: pricing['credits_included'] as number | undefined,
            price_per_credit: pricing['price_per_credit'] as number | undefined,
            trial_days: (pricing['trial_days'] as number) ?? row.trial_time_limit_days,
            trial_credits: pricing['trial_credits'] as number | undefined,
          },
          publisher: row.publisher || "FastCRM",
          is_featured: row.is_featured ?? false,
          is_new: row.is_new ?? false,
          rating: row.rating ?? undefined,
          reviews_count: row.reviews_count ?? undefined,
          installs_count: row.installs_count ?? 0,
          created_at: row.created_at,
          updated_at: row.updated_at,
          published_at: row.published_at || undefined,
        };
      });
    },
    staleTime: 5 * 60_000,
  });
}
