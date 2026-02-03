import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface SearchableEntity {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: 'contact' | 'company' | 'lead';
  avatar_url?: string | null;
  company?: string | null;
  website?: string | null;
}

interface UseEntitySearchResult {
  entities: SearchableEntity[];
  contacts: SearchableEntity[];
  companies: SearchableEntity[];
  leads: SearchableEntity[];
  isLoading: boolean;
  search: (query: string) => Promise<void>;
  searchContacts: (query: string) => Promise<SearchableEntity[]>;
  searchCompanies: (query: string) => Promise<SearchableEntity[]>;
  searchLeads: (query: string) => Promise<SearchableEntity[]>;
  getContactById: (id: string) => Promise<SearchableEntity | null>;
  getCompanyById: (id: string) => Promise<SearchableEntity | null>;
  getLeadById: (id: string) => Promise<SearchableEntity | null>;
}

export function useEntitySearch(): UseEntitySearchResult {
  const { currentWorkspace } = useWorkspace();
  const [entities, setEntities] = useState<SearchableEntity[]>([]);
  const [contacts, setContacts] = useState<SearchableEntity[]>([]);
  const [companies, setCompanies] = useState<SearchableEntity[]>([]);
  const [leads, setLeads] = useState<SearchableEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!currentWorkspace?.id) return;
    
    setIsLoading(true);
    try {
      const searchTerm = query ? `%${query}%` : '%';
      
      const [contactsResult, companiesResult, leadsResult] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, name, email, phone, avatar_url, company')
          .eq('workspace_id', currentWorkspace.id)
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .order('name')
          .limit(20),
        supabase
          .from('companies')
          .select('id, name, website, avatar_url, phone')
          .eq('workspace_id', currentWorkspace.id)
          .ilike('name', searchTerm)
          .order('name')
          .limit(20),
        supabase
          .from('leads')
          .select('id, name, email, phone')
          .eq('workspace_id', currentWorkspace.id)
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .order('name')
          .limit(20),
      ]);

      const mappedContacts: SearchableEntity[] = (contactsResult.data || []).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        type: 'contact' as const,
        avatar_url: c.avatar_url,
        company: c.company,
      }));

      const mappedCompanies: SearchableEntity[] = (companiesResult.data || []).map(c => ({
        id: c.id,
        name: c.name,
        type: 'company' as const,
        avatar_url: c.avatar_url,
        website: c.website,
        phone: c.phone,
      }));

      const mappedLeads: SearchableEntity[] = (leadsResult.data || []).map(l => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        type: 'lead' as const,
        avatar_url: null,
      }));

      setContacts(mappedContacts);
      setCompanies(mappedCompanies);
      setLeads(mappedLeads);
      setEntities([...mappedContacts, ...mappedCompanies, ...mappedLeads]);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  const searchContacts = useCallback(async (query: string): Promise<SearchableEntity[]> => {
    if (!currentWorkspace?.id) return [];
    
    const searchTerm = query ? `%${query}%` : '%';
    
    const { data } = await supabase
      .from('contacts')
      .select('id, name, email, phone, avatar_url, company')
      .eq('workspace_id', currentWorkspace.id)
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('name')
      .limit(20);

    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      type: 'contact' as const,
      avatar_url: c.avatar_url,
      company: c.company,
    }));
  }, [currentWorkspace?.id]);

  const searchCompanies = useCallback(async (query: string): Promise<SearchableEntity[]> => {
    if (!currentWorkspace?.id) return [];
    
    const searchTerm = query ? `%${query}%` : '%';
    
    const { data } = await supabase
      .from('companies')
      .select('id, name, website, avatar_url, phone')
      .eq('workspace_id', currentWorkspace.id)
      .ilike('name', searchTerm)
      .order('name')
      .limit(20);

    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      type: 'company' as const,
      avatar_url: c.avatar_url,
      website: c.website,
      phone: c.phone,
    }));
  }, [currentWorkspace?.id]);

  const searchLeads = useCallback(async (query: string): Promise<SearchableEntity[]> => {
    if (!currentWorkspace?.id) return [];
    
    const searchTerm = query ? `%${query}%` : '%';
    
    const { data } = await supabase
      .from('leads')
      .select('id, name, email, phone')
      .eq('workspace_id', currentWorkspace.id)
      .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('name')
      .limit(20);

    return (data || []).map(l => ({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      type: 'lead' as const,
      avatar_url: null,
    }));
  }, [currentWorkspace?.id]);

  const getContactById = useCallback(async (id: string): Promise<SearchableEntity | null> => {
    if (!id) return null;
    
    const { data } = await supabase
      .from('contacts')
      .select('id, name, email, phone, avatar_url, company')
      .eq('id', id)
      .single();

    if (!data) return null;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      type: 'contact',
      avatar_url: data.avatar_url,
      company: data.company,
    };
  }, []);

  const getCompanyById = useCallback(async (id: string): Promise<SearchableEntity | null> => {
    if (!id) return null;
    
    const { data } = await supabase
      .from('companies')
      .select('id, name, website, avatar_url, phone')
      .eq('id', id)
      .single();

    if (!data) return null;
    
    return {
      id: data.id,
      name: data.name,
      type: 'company',
      avatar_url: data.avatar_url,
      website: data.website,
      phone: data.phone,
    };
  }, []);

  const getLeadById = useCallback(async (id: string): Promise<SearchableEntity | null> => {
    if (!id) return null;
    
    const { data } = await supabase
      .from('leads')
      .select('id, name, email, phone')
      .eq('id', id)
      .single();

    if (!data) return null;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      type: 'lead',
      avatar_url: null,
    };
  }, []);

  return {
    entities,
    contacts,
    companies,
    leads,
    isLoading,
    search,
    searchContacts,
    searchCompanies,
    searchLeads,
    getContactById,
    getCompanyById,
    getLeadById,
  };
}
