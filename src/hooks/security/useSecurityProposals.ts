import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityProposals(filters?: { status?: string }) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["security-proposals", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("security_proposals")
        .select("*, security_leads(client_name, system_type, status), security_clients(name, client_type), security_installation_sites(site_name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createProposal = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_proposals")
        .insert({ ...values, workspace_id: workspaceId!, created_by: user.user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-proposals"] });
      toast.success("Proposta criada com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateProposal = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_proposals")
        .update({ ...values, updated_at: new Date().toISOString(), updated_by: user.user?.id })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-proposals"] });
      toast.success("Proposta atualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { proposals, isLoading, createProposal, updateProposal };
}

export function useSecurityProposal(id: string | undefined) {
  return useQuery({
    queryKey: ["security-proposal", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_proposals")
        .select("*, security_leads(*), security_clients(name, client_type), security_installation_sites(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
