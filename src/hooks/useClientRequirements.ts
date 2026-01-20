import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ClientRequirement {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  category: string | null;
  requirements: Record<string, string | number | boolean>;
  priority: "low" | "medium" | "high" | "critical";
  notes: string | null;
  status: "active" | "fulfilled" | "cancelled";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRequirementInput {
  contact_id?: string;
  company_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  category?: string;
  requirements: Record<string, string | number | boolean>;
  priority?: "low" | "medium" | "high" | "critical";
  notes?: string;
}

export function useClientRequirements(filters?: {
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  status?: string;
}) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["client-requirements", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("client_requirements")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (filters?.contactId) {
        query = query.eq("contact_id", filters.contactId);
      }
      if (filters?.companyId) {
        query = query.eq("company_id", filters.companyId);
      }
      if (filters?.opportunityId) {
        query = query.eq("opportunity_id", filters.opportunityId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClientRequirement[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateRequirement() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRequirementInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("client_requirements")
        .insert({
          workspace_id: currentWorkspace.id,
          ...input,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requirements"] });
      toast.success("Requisitos do cliente guardados");
    },
    onError: (error) => {
      toast.error("Erro ao guardar requisitos: " + error.message);
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CreateRequirementInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("client_requirements")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requirements"] });
      toast.success("Requisitos atualizados");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar requisitos: " + error.message);
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_requirements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-requirements"] });
      toast.success("Requisitos removidos");
    },
    onError: (error) => {
      toast.error("Erro ao remover requisitos: " + error.message);
    },
  });
}
