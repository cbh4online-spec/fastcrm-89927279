import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecuritySites() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["security-sites", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_installation_sites")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createSite = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = { ...values, workspace_id: workspaceId } as any;
      const { data, error } = await supabase
        .from("security_installation_sites")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-sites"] });
      toast.success("Local criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSite = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_installation_sites")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-sites"] });
      toast.success("Local atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { sites, isLoading, createSite, updateSite };
}

export function useSecuritySite(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["security-site", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_installation_sites")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!workspaceId,
  });
}
