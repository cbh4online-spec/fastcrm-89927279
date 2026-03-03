import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import type { RenewalContract, RenewalItem, CreateRenewalContractInput, CreateRenewalItemInput } from "@/types/renewal";

// ---- Contracts ----

export function useRenewalContracts(filters?: { status?: string; ownerUserId?: string; daysAhead?: number }) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["renewal-contracts", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!workspaceClient || !currentWorkspace) return [];

      let query = workspaceClient
        .from("renewal_contracts")
        .select("*, company:companies(id, name), contact:contacts(id, name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("next_renewal_date", { ascending: true, nullsFirst: false });

      if (filters?.status) {
        query = query.eq("status", filters.status as any);
      }
      if (filters?.ownerUserId) {
        query = query.eq("owner_user_id", filters.ownerUserId);
      }
      if (filters?.daysAhead) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.daysAhead);
        query = query.lte("next_renewal_date", futureDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as RenewalContract[];
    },
    enabled: !!workspaceClient && !!currentWorkspace,
  });
}

export function useRenewalContract(id: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["renewal-contract", id],
    queryFn: async () => {
      if (!workspaceClient || !id) return null;

      const { data, error } = await workspaceClient
        .from("renewal_contracts")
        .select("*, company:companies(id, name), contact:contacts(id, name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as RenewalContract;
    },
    enabled: !!workspaceClient && !!id,
  });
}

export function useCreateRenewalContract() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateRenewalContractInput) => {
      if (!workspaceClient || !currentWorkspace) throw new Error("Workspace not available");

      const { data, error } = await workspaceClient
        .from("renewal_contracts")
        .insert([{ ...input, workspace_id: currentWorkspace.id } as any])
        .select()
        .single();

      if (error) throw error;

      // Create "created" event
      await workspaceClient.from("renewal_events").insert([{
        workspace_id: currentWorkspace.id,
        contract_id: data.id,
        event_type: "created" as any,
        payload_json: { source_type: input.source_type || "manual" },
      }]);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewal-contracts"] });
      toast.success("Contrato de renovação criado");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Erro ao criar contrato");
    },
  });
}

export function useUpdateRenewalContract() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RenewalContract> & { id: string }) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const { data, error } = await workspaceClient
        .from("renewal_contracts")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contract", data.id] });
      toast.success("Contrato atualizado");
    },
    onError: () => toast.error("Erro ao atualizar contrato"),
  });
}

// ---- Items ----

export function useRenewalItems(contractId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["renewal-items", contractId],
    queryFn: async () => {
      if (!workspaceClient || !contractId) return [];

      const { data, error } = await workspaceClient
        .from("renewal_items")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as RenewalItem[];
    },
    enabled: !!workspaceClient && !!contractId,
  });
}

export function useCreateRenewalItem() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (input: CreateRenewalItemInput) => {
      if (!workspaceClient || !currentWorkspace) throw new Error("Workspace not available");

      const { data, error } = await workspaceClient
        .from("renewal_items")
        .insert([{ ...input, workspace_id: currentWorkspace.id } as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-items", data.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["renewal-contracts"] });
      toast.success("Item adicionado");
    },
    onError: () => toast.error("Erro ao adicionar item"),
  });
}

export function useUpdateRenewalItem() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RenewalItem> & { id: string }) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const { data, error } = await workspaceClient
        .from("renewal_items")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-items", data.contract_id] });
      toast.success("Item atualizado");
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });
}

export function useDeleteRenewalItem() {
  const queryClient = useQueryClient();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, contractId }: { id: string; contractId: string }) => {
      if (!workspaceClient) throw new Error("Workspace not available");

      const { error } = await workspaceClient
        .from("renewal_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { contractId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["renewal-items", data.contractId] });
      toast.success("Item removido");
    },
    onError: () => toast.error("Erro ao remover item"),
  });
}
