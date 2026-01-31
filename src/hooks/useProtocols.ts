import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { 
  ProductProtocol, 
  ProtocolProduct, 
  CreateProtocolData, 
  UpdateProtocolData,
  AddProtocolProductData 
} from "@/types/protocol";
import { toast } from "sonner";

export function useProtocols() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: protocols = [], isLoading, error, refetch } = useQuery({
    queryKey: ["protocols", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from("product_protocols")
        .select(`
          *,
          products:protocol_products(
            *,
            product:products(id, name, sku, base_price, images, stock_status)
          )
        `)
        .eq("workspace_id", workspaceId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as unknown as ProductProtocol[];
    },
    enabled: !!workspaceId,
  });

  const createProtocol = useMutation({
    mutationFn: async (data: CreateProtocolData) => {
      const { data: protocol, error } = await supabase
        .from("product_protocols")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return protocol;
    },
    onSuccess: () => {
      toast.success("Protocolo criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
    onError: (error) => {
      toast.error("Erro ao criar protocolo: " + error.message);
    },
  });

  const updateProtocol = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProtocolData }) => {
      const { error } = await supabase
        .from("product_protocols")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Protocolo atualizado");
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar protocolo: " + error.message);
    },
  });

  const deleteProtocol = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_protocols")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Protocolo eliminado");
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
    onError: (error) => {
      toast.error("Erro ao eliminar protocolo: " + error.message);
    },
  });

  const addProduct = useMutation({
    mutationFn: async (data: AddProtocolProductData) => {
      const { error } = await supabase
        .from("protocol_products")
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto adicionado ao protocolo");
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar produto: " + error.message);
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("protocol_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido do protocolo");
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
    onError: (error) => {
      toast.error("Erro ao remover produto: " + error.message);
    },
  });

  const updateProductQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { error } = await supabase
        .from("protocol_products")
        .update({ quantity })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
  });

  return {
    protocols,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    createProtocol: createProtocol.mutateAsync,
    updateProtocol: updateProtocol.mutateAsync,
    deleteProtocol: deleteProtocol.mutateAsync,
    addProduct: addProduct.mutateAsync,
    removeProduct: removeProduct.mutateAsync,
    updateProductQuantity: updateProductQuantity.mutateAsync,
    isCreating: createProtocol.isPending,
    isUpdating: updateProtocol.isPending,
  };
}

// Hook for fetching cross-sell suggestions
export function useCrossSells(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["cross-sells", productId],
    queryFn: async () => {
      if (!productId || !workspaceId) return [];

      const { data, error } = await supabase
        .from("product_cross_sells")
        .select(`
          *,
          target_product:products!product_cross_sells_target_product_id_fkey(
            id, name, sku, base_price, images
          )
        `)
        .eq("source_product_id", productId)
        .eq("is_active", true)
        .order("weight", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!workspaceId,
  });
}

// Hook for managing cross-sells
export function useCrossSellsManagement() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const addCrossSell = useMutation({
    mutationFn: async (data: {
      source_product_id: string;
      target_product_id: string;
      weight?: number;
      reason?: string;
    }) => {
      if (!workspaceId) throw new Error("Workspace não selecionado");

      const { error } = await supabase
        .from("product_cross_sells")
        .insert({
          workspace_id: workspaceId,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cross-sell adicionado");
      queryClient.invalidateQueries({ queryKey: ["cross-sells"] });
    },
    onError: (error) => {
      toast.error("Erro ao adicionar cross-sell: " + error.message);
    },
  });

  const removeCrossSell = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_cross_sells")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cross-sell removido");
      queryClient.invalidateQueries({ queryKey: ["cross-sells"] });
    },
  });

  return {
    addCrossSell: addCrossSell.mutateAsync,
    removeCrossSell: removeCrossSell.mutateAsync,
  };
}
