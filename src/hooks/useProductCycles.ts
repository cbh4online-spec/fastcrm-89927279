import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { ProductCycle, CycleTriggerType, CycleActionType } from "@/types/product";

export function useProductCycles(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-cycles", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("product_cycles")
        .select("*")
        .eq("product_id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .order("position");

      if (error) throw error;
      return data as ProductCycle[];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

export function useCreateProductCycle() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: {
      productId: string;
      name: string;
      triggerType: CycleTriggerType;
      triggerValue: number;
      actionType: CycleActionType;
      actionConfig?: Record<string, any>;
    }) => {
      if (!currentWorkspace?.id) {
        throw new Error("Workspace não encontrado");
      }

      // Get max position
      const { data: existing } = await supabase
        .from("product_cycles")
        .select("position")
        .eq("product_id", input.productId)
        .order("position", { ascending: false })
        .limit(1);

      const position = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data, error } = await supabase
        .from("product_cycles")
        .insert({
          workspace_id: currentWorkspace.id,
          product_id: input.productId,
          name: input.name,
          trigger_type: input.triggerType,
          trigger_value: input.triggerValue,
          action_type: input.actionType,
          action_config: input.actionConfig || {},
          position,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-cycles", variables.productId] });
      toast.success("Ciclo criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar ciclo: " + error.message);
    },
  });
}

export function useUpdateProductCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      productId: string;
      name?: string;
      triggerType?: CycleTriggerType;
      triggerValue?: number;
      actionType?: CycleActionType;
      actionConfig?: Record<string, any>;
      isActive?: boolean;
    }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.triggerType !== undefined) updateData.trigger_type = input.triggerType;
      if (input.triggerValue !== undefined) updateData.trigger_value = input.triggerValue;
      if (input.actionType !== undefined) updateData.action_type = input.actionType;
      if (input.actionConfig !== undefined) updateData.action_config = input.actionConfig;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { data, error } = await supabase
        .from("product_cycles")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return { data, productId: input.productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-cycles", productId] });
      toast.success("Ciclo atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar ciclo: " + error.message);
    },
  });
}

export function useDeleteProductCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from("product_cycles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { productId };
    },
    onSuccess: ({ productId }) => {
      queryClient.invalidateQueries({ queryKey: ["product-cycles", productId] });
      toast.success("Ciclo removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover ciclo: " + error.message);
    },
  });
}
