import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Contact {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  company_id: string | null;
  job_title: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  companies?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateContactData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  company_id?: string;
  job_title?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateContactData extends Partial<CreateContactData> {
  id: string;
}

export function useContacts() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ["contacts", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await supabase
        .from("contacts")
        .select("id, workspace_id, created_by, name, email, phone, company, company_id, job_title, notes, tags, created_at, updated_at, companies:company_id(id, name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Contact[];
    },
    enabled: !!currentWorkspace,
  });

  const createContact = useMutation({
    mutationFn: async (data: CreateContactData) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const { data: contact, error } = await supabase
        .from("contacts")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          company_id: data.company_id || null,
          job_title: data.job_title || null,
          notes: data.notes || null,
          tags: data.tags || [],
        })
        .select("*, companies:company_id(id, name)")
        .single();

      if (error) throw error;
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      toast.success("Contacto criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating contact:", error);
      toast.error("Erro ao criar contacto");
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...data }: UpdateContactData) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.phone !== undefined) updateData.phone = data.phone || null;
      if (data.company !== undefined) updateData.company = data.company || null;
      if (data.company_id !== undefined) updateData.company_id = data.company_id || null;
      if (data.job_title !== undefined) updateData.job_title = data.job_title || null;
      if (data.notes !== undefined) updateData.notes = data.notes || null;
      if (data.tags !== undefined) updateData.tags = data.tags || [];

      const { data: contact, error } = await supabase
        .from("contacts")
        .update(updateData)
        .eq("id", id)
        .select("*, companies:company_id(id, name)")
        .single();

      if (error) throw error;
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      toast.success("Contacto atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Error updating contact:", error);
      toast.error("Erro ao atualizar contacto");
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      toast.success("Contacto eliminado com sucesso");
    },
    onError: (error) => {
      console.error("Error deleting contact:", error);
      toast.error("Erro ao eliminar contacto");
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
    createContact,
    updateContact,
    deleteContact,
  };
}
