import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductProtocol } from "@/types/protocol";

interface UseProtocolsOptions {
  workspaceId?: string;
  category?: string;
  search?: string;
  limit?: number;
}

export function useProtocols(options: UseProtocolsOptions = {}) {
  const { workspaceId, category, search, limit = 50 } = options;

  const { data: protocols = [], isLoading, error, refetch } = useQuery({
    queryKey: ["protocols", workspaceId, category, search, limit],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("product_protocols")
        .select(`
          *,
          products:protocol_products(
            id,
            product_id,
            quantity,
            is_optional,
            notes,
            position,
            product:products(
              id,
              name,
              sku,
              base_price,
              images,
              stock_status,
              primary_image_index
            )
          )
        `)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("position", { ascending: true })
        .limit(limit);

      if (category) {
        query = query.eq("category", category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map products relation to expected format
      return (data || []).map((protocol) => ({
        ...protocol,
        products: protocol.products?.map((pp: Record<string, unknown>) => ({
          ...pp,
          product: pp.product,
        })),
      })) as ProductProtocol[];
    },
    enabled: !!workspaceId,
  });

  // Get unique categories from protocols
  const categories = [...new Set(protocols.map((p) => p.category).filter(Boolean))] as string[];

  return {
    protocols,
    categories,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}

export function useProtocol(protocolId: string | undefined) {
  const { data: protocol, isLoading, error, refetch } = useQuery({
    queryKey: ["protocol", protocolId],
    queryFn: async () => {
      if (!protocolId) return null;

      const { data, error } = await supabase
        .from("product_protocols")
        .select(`
          *,
          products:protocol_products(
            id,
            product_id,
            quantity,
            is_optional,
            notes,
            position,
            product:products(
              id,
              name,
              sku,
              base_price,
              images,
              stock_status,
              primary_image_index,
              description
            )
          )
        `)
        .eq("id", protocolId)
        .single();

      if (error) throw error;

      return {
        ...data,
        products: data.products?.map((pp: Record<string, unknown>) => ({
          ...pp,
          product: pp.product,
        })),
      } as ProductProtocol;
    },
    enabled: !!protocolId,
  });

  return {
    protocol,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
