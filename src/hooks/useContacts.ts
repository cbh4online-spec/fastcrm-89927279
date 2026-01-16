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
  is_primary_contact: boolean;
  job_title: string | null;
  notes: string | null;
  tags: string[];
  tax_id: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  company_id?: string;
  is_primary_contact?: boolean;
  job_title?: string;
  notes?: string;
  tags?: string[];
  tax_id?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
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
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Contact[];
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
          is_primary_contact: data.is_primary_contact || false,
          job_title: data.job_title || null,
          notes: data.notes || null,
          tags: data.tags || [],
          tax_id: data.tax_id || null,
          linkedin_url: data.linkedin_url || null,
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          twitter_url: data.twitter_url || null,
        })
        .select()
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
    mutationFn: async (input: { id: string } & Record<string, unknown>) => {
      const { id, ...data } = input;
      // Build update data dynamically - include all fields except 'id'
      const updateData: Record<string, unknown> = {};
      
      Object.keys(data).forEach((key) => {
        const value = data[key];
        // Convert undefined to null for database
        updateData[key] = value === undefined ? null : value;
      });

      const { data: contact, error } = await supabase
        .from("contacts")
        .update(updateData)
        .eq("id", id)
        .select()
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
    },
    onError: (error) => {
      console.error("Error deleting contact:", error);
      toast.error("Erro ao eliminar contacto");
    },
  });

  const deleteContacts = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
    },
    onError: (error) => {
      console.error("Error deleting contacts:", error);
      toast.error("Erro ao eliminar contactos");
    },
  });

  const addTagsToContacts = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      // Get current contacts to merge tags
      const { data: existingContacts, error: fetchError } = await supabase
        .from("contacts")
        .select("id, tags")
        .in("id", ids);

      if (fetchError) throw fetchError;

      // Update each contact with merged tags
      const updates = existingContacts?.map(contact => {
        const currentTags = contact.tags || [];
        const mergedTags = [...new Set([...currentTags, ...tags])];
        return supabase
          .from("contacts")
          .update({ tags: mergedTags })
          .eq("id", contact.id);
      }) || [];

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
    },
    onError: (error) => {
      console.error("Error adding tags:", error);
      toast.error("Erro ao adicionar etiquetas");
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
    createContact,
    updateContact,
    deleteContact,
    deleteContacts,
    addTagsToContacts,
  };
}

// Hook to fetch a single contact by ID
export function useContact(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }
      return data as Contact;
    },
    enabled: !!contactId,
  });
}
