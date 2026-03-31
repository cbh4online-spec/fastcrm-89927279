import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const KEY = "hr-contract-types";

export function useHRContractTypes(onlyActive = false) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: [KEY, wsId, onlyActive],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("hr_contract_types")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("name");
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHRContractType() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useMutation({
    mutationFn: async (values: { name: string; description?: string }) => {
      const { error } = await supabase
        .from("hr_contract_types")
        .insert({ ...values, workspace_id: wsId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Tipo de contrato criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateHRContractType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from("hr_contract_types")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Tipo de contrato atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHRContractType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_contract_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Tipo de contrato eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
