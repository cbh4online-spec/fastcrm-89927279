import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { 
  ClientPriceTier, 
  ProductTierPrice, 
  CreatePriceTierData, 
  UpdatePriceTierData,
  SetTierPriceData 
} from "@/types/pricing-tier";
import { getEffectivePrice } from "@/types/pricing-tier";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

// Hook for managing price tiers
export function usePriceTiers() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: tiers = [], isLoading, error, refetch } = useQuery({
    queryKey: ["price-tiers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("client_price_tiers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as ClientPriceTier[];
    },
    enabled: !!workspaceId,
  });

  const createTier = useMutation({
    mutationFn: async (data: CreatePriceTierData) => {
      const { data: tier, error } = await supabase
        .from("client_price_tiers")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return tier;
    },
    onSuccess: (data) => {
      console.log('[B2B-CATALOG] Tier created:', data.id);
      toast.success("Escalão criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["price-tiers"] });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "B2B.TIER_CREATED",
          entity_kind: "client_price_tier",
          entity_id: data.id,
          source_module: "b2b-catalog",
          payload: { name: data.name, code: data.code, discount_percentage: data.discount_percentage },
        });
      }
    },
    onError: (error) => {
      console.error('[B2B-CATALOG] TIER_CREATE_FAILED:', error.message);
      toast.error("Erro ao criar escalão: " + error.message);
    },
  });

  const updateTier = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePriceTierData }) => {
      const { error } = await supabase
        .from("client_price_tiers")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      console.log('[B2B-CATALOG] Tier updated:', id);
      toast.success("Escalão atualizado");
      queryClient.invalidateQueries({ queryKey: ["price-tiers"] });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "B2B.TIER_UPDATED",
          entity_kind: "client_price_tier",
          entity_id: id,
          source_module: "b2b-catalog",
          payload: { id },
        });
      }
    },
    onError: (error) => {
      console.error('[B2B-CATALOG] TIER_UPDATE_FAILED:', error.message);
      toast.error("Erro ao atualizar escalão: " + error.message);
    },
  });

  const deleteTier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_price_tiers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      console.log('[B2B-CATALOG] Tier deleted:', id);
      toast.success("Escalão eliminado");
      queryClient.invalidateQueries({ queryKey: ["price-tiers"] });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "B2B.TIER_DELETED",
          entity_kind: "client_price_tier",
          entity_id: id,
          source_module: "b2b-catalog",
          payload: { id },
        });
      }
    },
    onError: (error) => {
      console.error('[B2B-CATALOG] TIER_DELETE_FAILED:', error.message);
      toast.error("Erro ao eliminar escalão: " + error.message);
    },
  });

  return {
    tiers,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    createTier: createTier.mutateAsync,
    updateTier: updateTier.mutateAsync,
    deleteTier: deleteTier.mutateAsync,
    isCreating: createTier.isPending,
  };
}

// Hook for product tier prices
export function useProductTierPrices(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: tierPrices = [], isLoading } = useQuery({
    queryKey: ["product-tier-prices", productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from("product_tier_prices")
        .select(`
          *,
          tier:client_price_tiers(*)
        `)
        .eq("product_id", productId);

      if (error) throw error;
      return data as unknown as ProductTierPrice[];
    },
    enabled: !!productId,
  });

  const setTierPrice = useMutation({
    mutationFn: async (data: SetTierPriceData) => {
      const { error } = await supabase
        .from("product_tier_prices")
        .upsert({
          workspace_id: data.workspace_id,
          product_id: data.product_id,
          tier_id: data.tier_id,
          price_net: data.price_net,
          valid_from: data.valid_from || null,
          valid_until: data.valid_until || null,
          is_active: true,
        }, {
          onConflict: 'product_id,tier_id',
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('[B2B-CATALOG] Tier price set:', data.product_id, data.tier_id, data.price_net);
      toast.success("Preço de escalão definido");
      queryClient.invalidateQueries({ queryKey: ["product-tier-prices"] });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "B2B.PRICE_UPDATED",
          entity_kind: "product_tier_price",
          entity_id: `${data.product_id}_${data.tier_id}`,
          source_module: "b2b-catalog",
          payload: { product_id: data.product_id, tier_id: data.tier_id, price_net: data.price_net },
        });
      }
    },
    onError: (error) => {
      console.error('[B2B-CATALOG] PRICE_SET_FAILED:', error.message);
      toast.error("Erro ao definir preço: " + error.message);
    },
  });

  const removeTierPrice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_tier_prices")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      console.log('[B2B-CATALOG] Tier price removed:', id);
      toast.success("Preço de escalão removido");
      queryClient.invalidateQueries({ queryKey: ["product-tier-prices"] });
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: "B2B.PRICE_REMOVED",
          entity_kind: "product_tier_price",
          entity_id: id,
          source_module: "b2b-catalog",
          payload: { id },
        });
      }
    },
    onError: (error) => {
      console.error('[B2B-CATALOG] PRICE_REMOVE_FAILED:', error.message);
    },
  });

  return {
    tierPrices,
    loading: isLoading,
    setTierPrice: setTierPrice.mutateAsync,
    removeTierPrice: removeTierPrice.mutateAsync,
  };
}

// Hook to get the effective price for a client based on their tier
export function useClientPricing(clientTierId: string | null | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: tier } = useQuery({
    queryKey: ["client-tier", clientTierId],
    queryFn: async () => {
      if (!clientTierId) return null;

      const { data, error } = await supabase
        .from("client_price_tiers")
        .select("*")
        .eq("id", clientTierId)
        .single();

      if (error) return null;
      return data as ClientPriceTier;
    },
    enabled: !!clientTierId,
  });

  // Function to get effective price for a product
  const getProductPrice = async (productId: string, basePrice: number): Promise<number> => {
    if (!tier) return basePrice;

    // Check for specific tier price
    const { data: tierPrice } = await supabase
      .from("product_tier_prices")
      .select("*")
      .eq("product_id", productId)
      .eq("tier_id", tier.id)
      .eq("is_active", true)
      .maybeSingle();

    return getEffectivePrice(basePrice, tier, tierPrice as ProductTierPrice | null);
  };

  // Sync function for immediate use (uses cached tier only)
  const getProductPriceSync = (basePrice: number): number => {
    if (!tier || !tier.is_active) return basePrice;
    
    // Apply tier discount
    if (tier.discount_percentage > 0) {
      return basePrice * (1 - tier.discount_percentage / 100);
    }
    
    return basePrice;
  };

  return {
    tier,
    getProductPrice,
    getProductPriceSync,
    discountPercentage: tier?.discount_percentage || 0,
  };
}
