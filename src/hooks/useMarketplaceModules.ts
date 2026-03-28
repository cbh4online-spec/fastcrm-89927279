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
          embedded_config: embeddedConfig as any,
          permissions: {
            data_permissions: Array.isArray((permissions as any).data_permissions) ? (permissions as any).data_permissions : [],
            workspace_isolation: (permissions as any).workspace_isolation ?? true,
            can_send_emails: (permissions as any).can_send_emails ?? false,
            can_send_whatsapp: (permissions as any).can_send_whatsapp ?? false,
            can_create_activities: (permissions as any).can_create_activities ?? false,
            can_trigger_automations: (permissions as any).can_trigger_automations ?? false,
          },
          pricing: {
            type: ((pricing as any).type || row.pricing_model || "free") as ModulePricingType,
            base_price: (pricing as any).base_price ?? row.price_eur ?? 0,
            currency: (pricing as any).currency || "EUR",
            usage_unit: (pricing as any).usage_unit,
            price_per_unit: (pricing as any).price_per_unit,
            included_units: (pricing as any).included_units,
            credits_included: (pricing as any).credits_included,
            price_per_credit: (pricing as any).price_per_credit,
            trial_days: (pricing as any).trial_days ?? row.trial_time_limit_days,
            trial_credits: (pricing as any).trial_credits,
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
