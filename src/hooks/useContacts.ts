import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface Contact {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  emails: unknown[];
  phones: unknown[];
  company: string | null;
  company_id: string | null;
  is_primary_contact: boolean;
  job_title: string | null;
  notes: string | null;
  tags: string[];
  tax_id: string | null;
  client_number: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  lead_status: string;
  icp_fit_score: number;
  engagement_score: number;
  pare_score: number;
  marketing_opt_in: boolean;
  next_followup_at: string | null;
  deleted_at: string | null;
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
  client_number?: string;
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
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ["contacts", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await workspaceClient
        .from("contacts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!currentWorkspace,
  });

  // Query to get contact IDs that are already linked to SJ profiles
  const linkedContactsQuery = useQuery({
    queryKey: ["sj-linked-contacts", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return new Set<string>();
      
      const { data, error } = await workspaceClient
        .from("sj_profiles")
        .select("contact_id")
        .eq("workspace_id", currentWorkspace.id)
        .not("contact_id", "is", null);

      if (error) throw error;
      return new Set(data.map((p) => p.contact_id as string));
    },
    enabled: !!currentWorkspace,
  });

  const createContact = useMutation({
    mutationFn: async (data: CreateContactData) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      // Domain auto-link: resolve company from email domain
      let resolvedCompanyId = data.company_id || null;
      let resolvedCompanyName = data.company || null;

      if (!resolvedCompanyId && data.email) {
        const emailDomain = data.email.split('@')[1]?.toLowerCase();
        if (emailDomain) {
          const { data: matchedCompany } = await workspaceClient
            .from("companies")
            .select("id, name")
            .eq("workspace_id", currentWorkspace.id)
            .ilike("domain", emailDomain)
            .is("deleted_at", null)
            .limit(1)
            .maybeSingle();

          if (matchedCompany) {
            resolvedCompanyId = matchedCompany.id;
            resolvedCompanyName = resolvedCompanyName || matchedCompany.name;
          }
        }
      }

      const { data: contact, error } = await workspaceClient
        .from("contacts")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          company: resolvedCompanyName,
          company_id: resolvedCompanyId,
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

      if (error) {
        if (error.code === "23505") {
          const msg = error.message || "";
          if (msg.includes("email")) throw new Error("DUPLICATE_EMAIL");
          if (msg.includes("tax_id")) throw new Error("DUPLICATE_TAX_ID");
          throw new Error("DUPLICATE_FIELD");
        }
        throw error;
      }
      return contact;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      console.log(`[CONTACTS] Contact created: ${data.id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTACT.CREATED',
          entity_kind: 'contact',
          entity_id: data.id,
          source_module: 'crm-contacts',
          payload: {
            has_email: !!variables.email,
            has_company: !!variables.company_id,
            has_tax_id: !!variables.tax_id,
            auto_linked_company: !variables.company_id && !!data.company_id,
          },
        });
      }
      toast.success("Contacto criado com sucesso");
    },
    onError: (error) => {
      console.warn('[CONTACTS] CREATE_FAILED', error.message);
      if (error.message === "DUPLICATE_EMAIL") {
        toast.error("Já existe um contacto com este email neste workspace.");
      } else if (error.message === "DUPLICATE_TAX_ID") {
        toast.error("Já existe um contacto com este NIF neste workspace.");
      } else if (error.message === "DUPLICATE_FIELD") {
        toast.error("Já existe um contacto com estes dados neste workspace.");
      } else {
        toast.error("Erro ao criar contacto");
      }
    },
  });

  const updateContact = useMutation({
    mutationFn: async (input: { id: string } & Record<string, unknown>) => {
      const { id, ...data } = input;
      // Build update data dynamically - include all fields except 'id'
      const updateData: Record<string, unknown> = {
        updated_by: null, // will be overridden below if user available
      };
      
      Object.keys(data).forEach((key) => {
        const value = data[key];
        updateData[key] = value === undefined ? null : value;
      });

      const { data: contact, error } = await workspaceClient
        .from("contacts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          const msg = error.message || "";
          if (msg.includes("email")) throw new Error("DUPLICATE_EMAIL");
          if (msg.includes("tax_id")) throw new Error("DUPLICATE_TAX_ID");
          throw new Error("DUPLICATE_FIELD");
        }
        throw error;
      }
      return contact;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      const { id, ...changedFields } = variables;
      console.log(`[CONTACTS] Contact updated: ${id}, fields: ${Object.keys(changedFields).join(', ')}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTACT.UPDATED',
          entity_kind: 'contact',
          entity_id: id,
          source_module: 'crm-contacts',
          payload: { fields_changed: Object.keys(changedFields) },
        });
      }
      toast.success("Contacto atualizado com sucesso");
    },
    onError: (error) => {
      console.warn('[CONTACTS] UPDATE_FAILED', error.message);
      if (error.message === "DUPLICATE_EMAIL") {
        toast.error("Já existe um contacto com este email neste workspace.");
      } else if (error.message === "DUPLICATE_TAX_ID") {
        toast.error("Já existe um contacto com este NIF neste workspace.");
      } else if (error.message === "DUPLICATE_FIELD") {
        toast.error("Já existe um contacto com estes dados neste workspace.");
      } else {
        toast.error("Erro ao atualizar contacto");
      }
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await workspaceClient
        .from("contacts")
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      console.log(`[CONTACTS] Contact soft-deleted: ${id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTACT.DELETED',
          entity_kind: 'contact',
          entity_id: id,
          source_module: 'crm-contacts',
        });
      }
    },
    onError: (error) => {
      console.warn('[CONTACTS] DELETE_FAILED', error.message);
      toast.error("Erro ao eliminar contacto");
    },
  });

  const restoreContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient
        .from("contacts")
        .update({ deleted_at: null, updated_by: user?.id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      console.log(`[CONTACTS] Contact restored: ${id}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTACT.RESTORED',
          entity_kind: 'contact',
          entity_id: id,
          source_module: 'crm-contacts',
        });
      }
      toast.success("Contacto restaurado");
    },
    onError: (error) => {
      console.warn('[CONTACTS] RESTORE_FAILED', error.message);
      toast.error("Erro ao restaurar contacto");
    },
  });

  const deleteContacts = useMutation({
    mutationFn: async (ids: string[]) => {
      // Soft delete bulk
      const { error } = await workspaceClient
        .from("contacts")
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      console.log(`[CONTACTS] Bulk deleted: ${ids.length} contacts`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTACT.BULK_DELETED',
          entity_kind: 'contact',
          entity_id: ids[0],
          source_module: 'crm-contacts',
          payload: { count: ids.length },
        });
      }
    },
    onError: (error) => {
      console.warn('[CONTACTS] BULK_DELETE_FAILED', error.message);
      toast.error("Erro ao eliminar contactos");
    },
  });

  const addTagsToContacts = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      // Get current contacts to merge tags
      const { data: existingContacts, error: fetchError } = await workspaceClient
        .from("contacts")
        .select("id, tags")
        .in("id", ids);

      if (fetchError) throw fetchError;

      // Update each contact with merged tags
      const updates = existingContacts?.map(contact => {
        const currentTags = contact.tags || [];
        const mergedTags = [...new Set([...currentTags, ...tags])];
        return workspaceClient
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

  const bulkUpdateContacts = useMutation({
    mutationFn: async ({ ids, changes }: { ids: string[]; changes: Record<string, unknown> }) => {
      const { error } = await workspaceClient
        .from("contacts")
        .update(changes)
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["smart-contacts"] });
      console.log(`[CONTACTS] Bulk updated: ${variables.ids.length} contacts, fields: ${Object.keys(variables.changes).join(', ')}`);
      if (currentWorkspace) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'CONTACT.BULK_UPDATED',
          entity_kind: 'contact',
          entity_id: variables.ids[0],
          source_module: 'crm-contacts',
          payload: { count: variables.ids.length, fields_changed: Object.keys(variables.changes) },
        });
      }
    },
    onError: (error) => {
      console.warn('[CONTACTS] BULK_UPDATE_FAILED', error.message);
      toast.error("Erro ao atualizar contactos em massa");
    },
  });

  return {
    contacts: contactsQuery.data || [],
    linkedContactIds: linkedContactsQuery.data,
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
    createContact,
    updateContact,
    deleteContact,
    restoreContact,
    deleteContacts,
    addTagsToContacts,
    bulkUpdateContacts,
  };
}

// Hook to fetch a single contact by ID
export function useContact(contactId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();
  
  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      if (!contactId) return null;
      
      const { data, error } = await workspaceClient
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
