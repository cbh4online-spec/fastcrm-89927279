import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a URL parameter (UUID or custom slug) to a workspace_id.
 * 
 * Resolution order:
 * 1. If the param looks like a UUID → use it directly
 * 2. Otherwise → look up store_settings.store_slug
 * 3. Fallback → look up workspaces.slug (newsletters table pattern)
 */
export function useResolveStoreWorkspace(param: string | undefined) {
  const isUUID = param ? UUID_REGEX.test(param) : false;

  const { data, isLoading, error } = useQuery({
    queryKey: ["resolve-store-workspace", param],
    queryFn: async () => {
      if (!param) return null;

      // If it's a UUID, use directly
      if (UUID_REGEX.test(param)) {
        return { workspaceId: param, slug: param };
      }

      // Try store_settings.store_slug
      const { data: storeData, error: storeError } = await supabase
        .from("store_settings")
        .select("workspace_id, store_slug")
        .eq("store_slug", param)
        .maybeSingle();

      if (!storeError && storeData) {
        return { workspaceId: storeData.workspace_id, slug: storeData.store_slug || param };
      }

      // Fallback: not found
      return null;
    },
    enabled: !!param,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    workspaceId: isUUID ? param! : (data?.workspaceId || ""),
    slug: param || "",
    isLoading: isUUID ? false : isLoading,
    notFound: !isUUID && !isLoading && !data,
  };
}
