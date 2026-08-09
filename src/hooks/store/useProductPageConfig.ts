import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DEFAULT_PRODUCT_PAGE_CONFIG,
  parseProductPageConfig,
  type ProductPageConfig,
} from "@/lib/store/productPageConfig";

const sb = supabase as any;

/** Lê a configuração da ficha de produto (funciona também na loja pública). */
export function useProductPageConfig(workspaceId?: string) {
  return useQuery({
    queryKey: ["product-page-config", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProductPageConfig> => {
      const { data, error } = await sb
        .from("store_settings")
        .select("product_page_config")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return parseProductPageConfig(data?.product_page_config);
    },
    placeholderData: DEFAULT_PRODUCT_PAGE_CONFIG,
  });
}

/** Guarda a configuração da ficha de produto do workspace atual. */
export function useUpdateProductPageConfig(workspaceId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (config: ProductPageConfig) => {
      if (!workspaceId) throw new Error("Workspace não definido");
      const { error } = await sb
        .from("store_settings")
        .upsert(
          {
            workspace_id: workspaceId,
            product_page_config: config,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" }
        );
      if (error) throw error;
      return config;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-page-config", workspaceId] });
      qc.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Definições da ficha de produto guardadas");
    },
    onError: (error: any) => {
      toast.error("Erro ao guardar: " + (error?.message || "tente novamente"));
    },
  });
}
