import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityClients(filters?: { client_type?: string; status?: string }) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["security-clients", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("security_clients")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");

      if (filters?.client_type) query = query.eq("client_type", filters.client_type);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createClient = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_clients")
        .insert({ ...values, workspace_id: workspaceId!, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-clients"] });
      toast.success("Cliente criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("security_clients")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-clients"] });
      toast.success("Cliente atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { clients, isLoading, createClient, updateClient };
}

export function useSecurityClient(id: string | undefined) {
  return useQuery({
    queryKey: ["security-client", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_clients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useSecurityClientSites(clientId: string | undefined) {
  return useQuery({
    queryKey: ["security-client-sites", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("security_installation_sites")
        .select("*")
        .eq("client_id", clientId)
        .order("site_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useSecurityClientContracts(clientId: string | undefined) {
  return useQuery({
    queryKey: ["security-client-contracts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("security_contracts")
        .select("*, security_systems(system_type, security_installation_sites(site_name))")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}
