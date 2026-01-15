import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Company {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyData {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {
  id: string;
}

export function useCompanies() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companiesQuery = useQuery({
    queryKey: ["companies", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Company[];
    },
    enabled: !!currentWorkspace,
  });

  const createCompany = useMutation({
    mutationFn: async (data: CreateCompanyData) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const { data: company, error } = await supabase
        .from("companies")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: data.name,
          website: data.website || null,
          industry: data.industry || null,
          size: data.size || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
          tags: data.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", currentWorkspace?.id] });
      toast.success("Empresa criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating company:", error);
      toast.error("Erro ao criar empresa");
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...data }: UpdateCompanyData) => {
      const { data: company, error } = await supabase
        .from("companies")
        .update({
          name: data.name,
          website: data.website,
          industry: data.industry,
          size: data.size,
          phone: data.phone,
          email: data.email,
          address: data.address,
          notes: data.notes,
          tags: data.tags,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", currentWorkspace?.id] });
      toast.success("Empresa atualizada com sucesso");
    },
    onError: (error) => {
      console.error("Error updating company:", error);
      toast.error("Erro ao atualizar empresa");
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", currentWorkspace?.id] });
      toast.success("Empresa eliminada com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting company:", error);
      toast.error("Erro ao eliminar empresa");
    },
  });

  return {
    companies: companiesQuery.data || [],
    isLoading: companiesQuery.isLoading,
    error: companiesQuery.error,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}

// Hook to fetch a single company by ID
export function useCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }
      return data as Company;
    },
    enabled: !!companyId,
  });
}
