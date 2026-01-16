import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CompanyContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  is_primary_contact: boolean;
  created_at: string;
}

export function useCompanyContacts(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ["company-contacts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, phone, job_title, is_primary_contact, created_at")
        .eq("company_id", companyId)
        .order("is_primary_contact", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CompanyContact[];
    },
    enabled: !!companyId,
  });

  const setPrimaryContact = useMutation({
    mutationFn: async ({ contactId, companyId }: { contactId: string; companyId: string }) => {
      // First, remove primary from all contacts of this company
      await supabase
        .from("contacts")
        .update({ is_primary_contact: false })
        .eq("company_id", companyId);
      
      // Then set the selected contact as primary
      const { error } = await supabase
        .from("contacts")
        .update({ is_primary_contact: true })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-contacts", companyId] });
      toast.success("Contacto principal definido");
    },
    onError: (error) => {
      console.error("Error setting primary contact:", error);
      toast.error("Erro ao definir contacto principal");
    },
  });

  const unlinkContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ company_id: null, is_primary_contact: false })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-contacts", companyId] });
      toast.success("Contacto desvinculado da empresa");
    },
    onError: (error) => {
      console.error("Error unlinking contact:", error);
      toast.error("Erro ao desvincular contacto");
    },
  });

  const linkContact = useMutation({
    mutationFn: async ({ contactId, companyId, isPrimary = false }: { contactId: string; companyId: string; isPrimary?: boolean }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ company_id: companyId, is_primary_contact: isPrimary })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-contacts", companyId] });
      toast.success("Contacto vinculado à empresa");
    },
    onError: (error) => {
      console.error("Error linking contact:", error);
      toast.error("Erro ao vincular contacto");
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    error: contactsQuery.error,
    setPrimaryContact,
    unlinkContact,
    linkContact,
  };
}

// Helper to determine if a NIF represents an individual (person or sole proprietor)
export function isIndividualNif(nif: string): boolean {
  if (!nif || nif.length !== 9) return false;
  const firstDigit = nif.charAt(0);
  // NIFs starting with 1, 2, or 3 are individuals
  return ['1', '2', '3'].includes(firstDigit);
}

// Get entity type based on NIF
export function getEntityTypeFromNif(nif: string): 'sole_proprietor' | 'individual' | 'company' {
  if (!nif || nif.length !== 9) return 'company';
  const firstDigit = nif.charAt(0);
  
  switch (firstDigit) {
    case '1':
    case '2':
      return 'individual'; // Pessoa singular
    case '3':
      return 'sole_proprietor'; // Empresário em nome individual
    default:
      return 'company'; // Empresa
  }
}
