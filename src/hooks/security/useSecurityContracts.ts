import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityContracts() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["security-contracts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_contracts")
        .select("*, security_systems(system_type, status, security_installation_sites(site_name))")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createContract = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_contracts")
        .insert({ ...values, workspace_id: workspaceId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-contracts"] });
      toast.success("Contrato criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_contracts")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-contracts"] });
      toast.success("Contrato atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { contracts, isLoading, createContract, updateContract };
}

export function useSecurityContract(id: string | undefined) {
  return useQuery({
    queryKey: ["security-contract", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_contracts")
        .select("*, security_systems(*, security_installation_sites(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
