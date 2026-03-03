import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProcurementProjects(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["procurement-projects", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("procurement_projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  return { ...query, projects: query.data || [] };
}

export function useProcurementProject(projectId: string | undefined) {
  const project = useQuery({
    queryKey: ["procurement-project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("procurement_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const items = useQuery({
    queryKey: ["procurement-project-items", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("procurement_project_items")
        .select("*, products:product_id(name, sku, stock_quantity)")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const needs = useQuery({
    queryKey: ["procurement-needs", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("procurement_needs")
        .select("*, products:product_id(name, sku)")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  return {
    project: project.data,
    items: items.data || [],
    needs: needs.data || [],
    isLoading: project.isLoading || items.isLoading || needs.isLoading,
  };
}

export function useCreateProjectFromProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposal_id, workspace_id }: { proposal_id: string; workspace_id: string }) => {
      const { data, error } = await supabase.functions.invoke("project-from-won-proposal", {
        body: { proposal_id, workspace_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["procurement-projects"] });
      if (data?.already_exists) {
        toast.info("Projeto já existente para esta proposta");
      } else {
        toast.success("Projeto e necessidades de compra criados!");
      }
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });
}
