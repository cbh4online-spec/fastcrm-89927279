import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface MarketplaceBundle {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  icon: string | null;
  module_ids: string[];
  original_price: number;
  bundle_price: number;
  discount_percent: number;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  target_audience: string | null;
  created_at: string;
}

export interface WorkspaceBundle {
  id: string;
  workspace_id: string;
  bundle_id: string;
  status: string;
  purchased_at: string;
  expires_at: string | null;
  bundle?: MarketplaceBundle;
}

export function useMarketplaceBundles() {
  return useQuery({
    queryKey: ["marketplace-bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_bundles")
        .select("*")
        .eq("is_active", true)
        .order("bundle_price", { ascending: true });

      if (error) throw error;
      return data as MarketplaceBundle[];
    },
  });
}

export function useWorkspaceBundles() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["workspace-bundles", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("workspace_bundles")
        .select(`
          *,
          bundle:marketplace_bundles(*)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      return data as WorkspaceBundle[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function usePurchaseBundle() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bundleId: string) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");

      // Call edge function to create checkout
      const { data, error } = await supabase.functions.invoke("bundle-checkout", {
        body: { bundleId, workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank");
      }
      queryClient.invalidateQueries({ queryKey: ["workspace-bundles"] });
    },
    onError: (error) => {
      console.error("Error purchasing bundle:", error);
      toast.error("Erro ao processar compra");
    },
  });
}

export function useBundleWithModules(bundleId: string | undefined) {
  return useQuery({
    queryKey: ["bundle-with-modules", bundleId],
    queryFn: async () => {
      if (!bundleId) return null;

      const { data: bundle, error: bundleError } = await supabase
        .from("marketplace_bundles")
        .select("*")
        .eq("id", bundleId)
        .single();

      if (bundleError) throw bundleError;

      // Fetch modules in the bundle
      const { data: modules, error: modulesError } = await supabase
        .from("marketplace_modules")
        .select("id, name, slug, icon, category, pricing")
        .in("id", bundle.module_ids);

      if (modulesError) throw modulesError;

      return {
        ...bundle,
        modules,
      };
    },
    enabled: !!bundleId,
  });
}
