import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { ProductComponent, Product } from "@/types/product";

export function useProductComponents(parentProductId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-components", parentProductId],
    queryFn: async () => {
      if (!parentProductId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("product_components")
        .select(`
          *,
          component:products!product_components_component_product_id_fkey(*)
        `)
        .eq("parent_product_id", parentProductId)
        .eq("workspace_id", currentWorkspace.id)
        .order("position");

      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        component: item.component as Product,
      })) as ProductComponent[];
    },
    enabled: !!parentProductId && !!currentWorkspace?.id,
  });
}

export function useAddProductComponent() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      parentProductId: string;
      componentProductId: string;
      quantity?: number;
      isOptional?: boolean;
      priceOverride?: number;
      costOverride?: number;
    }) => {
      if (!currentWorkspace?.id) {
        throw new Error("Workspace não encontrado");
      }

      // Get max position
      const { data: existing } = await supabase
        .from("product_components")
        .select("position")
        .eq("parent_product_id", input.parentProductId)
        .order("position", { ascending: false })
        .limit(1);

      const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data, error } = await supabase
        .from("product_components")
        .insert({
          workspace_id: currentWorkspace.id,
          parent_product_id: input.parentProductId,
          component_product_id: input.componentProductId,
          quantity: input.quantity || 1,
          is_optional: input.isOptional || false,
          price_override: input.priceOverride,
          cost_override: input.costOverride,
          position,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-components", variables.parentProductId] });
      toast.success("Componente adicionado!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar componente: " + error.message);
    },
  });
}

export function useUpdateProductComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      parentProductId: string;
      quantity?: number;
      isOptional?: boolean;
      priceOverride?: number | null;
      costOverride?: number | null;
      position?: number;
    }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (input.quantity !== undefined) updateData.quantity = input.quantity;
      if (input.isOptional !== undefined) updateData.is_optional = input.isOptional;
      if (input.priceOverride !== undefined) updateData.price_override = input.priceOverride;
      if (input.costOverride !== undefined) updateData.cost_override = input.costOverride;
      if (input.position !== undefined) updateData.position = input.position;

      const { data, error } = await supabase
        .from("product_components")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return { data, parentProductId: input.parentProductId };
    },
    onSuccess: ({ parentProductId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-components", parentProductId] });
      toast.success("Componente atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar componente: " + error.message);
    },
  });
}

export function useRemoveProductComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, parentProductId }: { id: string; parentProductId: string }) => {
      const { error } = await supabase
        .from("product_components")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { parentProductId };
    },
    onSuccess: ({ parentProductId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-components", parentProductId] });
      toast.success("Componente removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover componente: " + error.message);
    },
  });
}

// Calculate bundle totals
export function calculateBundleTotals(components: ProductComponent[], bundlePriceMode: string, manualPrice?: number) {
  let totalPrice = 0;
  let totalCost = 0;

  components.forEach(comp => {
    const price = comp.price_override ?? (comp.component?.base_price || 0);
    const cost = comp.cost_override ?? (comp.component?.direct_cost || 0);
    
    totalPrice += price * comp.quantity;
    totalCost += cost * comp.quantity;
  });

  const finalPrice = bundlePriceMode === 'manual' && manualPrice !== undefined ? manualPrice : totalPrice;
  const grossMargin = finalPrice - totalCost;
  const grossMarginPct = finalPrice > 0 ? (grossMargin / finalPrice) * 100 : 0;

  return {
    componentsPrice: totalPrice,
    componentsCost: totalCost,
    finalPrice,
    totalCost,
    grossMargin,
    grossMarginPct,
  };
}
