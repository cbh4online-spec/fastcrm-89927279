import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AIRecommendation {
  product_id: string;
  product_name: string;
  reason: string;
  type: "complementar" | "upgrade" | "manutencao" | "substituicao";
  priority: "alta" | "media" | "baixa";
  base_price?: number;
  images?: string[] | null;
}

export interface ProtocolRecommendation {
  protocol_id: string;
  protocol_name: string;
  reason: string;
  priority: "alta" | "media" | "baixa";
}

export function useProtocolRecommendations(
  pathologyId: string | undefined,
  workspaceId: string | undefined
) {
  return useQuery({
    queryKey: ["ai-protocol-recommendations", pathologyId, workspaceId],
    queryFn: async () => {
      if (!pathologyId || !workspaceId) return [];

      const { data, error } = await supabase.functions.invoke("ai-protocol-recommendations", {
        body: { pathologyId, workspaceId },
      });

      if (error) {
        console.warn("[B2B-INTELLIGENCE] PROTOCOL_RECS_FAILED", error.message ?? error);
        return [];
      }

      return (data?.recommendations || []) as ProtocolRecommendation[];
    },
    enabled: !!pathologyId && !!workspaceId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}

export function useCartRecommendations(
  cartProductIds: string[],
  workspaceId: string | undefined
) {
  const key = cartProductIds.sort().join(",");

  return useQuery({
    queryKey: ["ai-cart-recommendations", key, workspaceId],
    queryFn: async () => {
      if (cartProductIds.length === 0 || !workspaceId) return [];

      const { data, error } = await supabase.functions.invoke("ai-cart-recommendations", {
        body: { cartProductIds, workspaceId },
      });

      if (error) {
        console.warn("[B2B-INTELLIGENCE] CART_RECS_FAILED", error.message ?? error);
        return [];
      }

      return (data?.recommendations || []) as AIRecommendation[];
    },
    enabled: cartProductIds.length > 0 && !!workspaceId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
