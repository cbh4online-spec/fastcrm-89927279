import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityLeads(filters?: { status?: string; origin?: string; system_type?: string }) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["security-leads", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("security_leads")
        .select("*, security_partners(name), security_clients(name, client_type), security_installation_sites(site_name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.origin) query = query.eq("origin", filters.origin);
      if (filters?.system_type) query = query.eq("system_type", filters.system_type);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createLead = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_leads")
        .insert({ ...values, workspace_id: workspaceId!, created_by: user.user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-leads"] });
      toast.success("Lead criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_leads")
        .update({ ...values, updated_at: new Date().toISOString(), updated_by: user.user?.id })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-leads"] });
      toast.success("Lead atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { leads, isLoading, createLead, updateLead };
}

export function useSecurityLead(id: string | undefined) {
  return useQuery({
    queryKey: ["security-lead", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_leads")
        .select("*, security_partners(name), security_clients(name, client_type), security_installation_sites(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
