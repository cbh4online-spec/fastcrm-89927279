import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityRenewals() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: renewals = [], isLoading } = useQuery({
    queryKey: ["security-renewals", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_renewals")
        .select("*, security_contracts(contract_type, contract_status, start_date, end_date, security_systems(system_type, security_installation_sites(site_name)))")
        .eq("workspace_id", workspaceId)
        .order("renewal_due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createRenewal = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = { ...values, workspace_id: workspaceId } as any;
      const { data, error } = await supabase.from("security_renewals").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-renewals"] }); toast.success("Renovação criada"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRenewal = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase.from("security_renewals").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["security-renewals"] }); toast.success("Renovação atualizada"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { renewals, isLoading, createRenewal, updateRenewal };
}
