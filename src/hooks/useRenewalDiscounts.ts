import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import type { RenewalDiscount, CreateRenewalDiscountInput } from "@/types/renewal";

export function useRenewalDiscounts(contractId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["renewal-discounts", contractId],
    queryFn: async () => {
      if (!workspaceClient || !contractId) return [];

      const { data, error } = await workspaceClient
        .from("renewal_discounts")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as RenewalDiscount[];
    },
    enabled: !!workspaceClient && !!contractId,
  });
}

export function useCreateRenewalDiscount() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateRenewalDiscountInput) => {
      if (!workspaceClient || !currentWorkspace) throw new Error("Workspace not available");

      const { data, error } = await workspaceClient
        .from("renewal_discounts")
        .insert([{ ...input, workspace_id: currentWorkspace.id } as any])
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RenewalDiscount;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-discounts", data.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contract", data.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contracts"] });
      toast.success("Desconto adicionado");
    },
    onError: () => toast.error("Erro ao adicionar desconto"),
  });
}

export function useUpdateRenewalDiscount() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RenewalDiscount> & { id: string }) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const { data, error } = await workspaceClient
        .from("renewal_discounts")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as RenewalDiscount;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-discounts", data.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contract", data.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contracts"] });
      toast.success("Desconto atualizado");
    },
    onError: () => toast.error("Erro ao atualizar desconto"),
  });
}

export function useDeleteRenewalDiscount() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, contractId }: { id: string; contractId: string }) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const { error } = await workspaceClient
        .from("renewal_discounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { contractId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-discounts", data.contractId] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contracts"] });
      toast.success("Desconto removido");
    },
    onError: () => toast.error("Erro ao remover desconto"),
  });
}
