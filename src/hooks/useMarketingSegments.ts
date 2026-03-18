import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { MarketingSegment, SegmentFilterRules } from '@/types/marketing';

// Map DB to frontend type
function mapSegment(row: any): MarketingSegment {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    filterRules: row.filter_rules as SegmentFilterRules,
    contactCount: row.contact_count || 0,
    isDynamic: row.is_dynamic ?? true,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useMarketingSegments() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-segments', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('marketing_segments')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (error) throw error;
      return (data || []).map(mapSegment);
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useMarketingSegment(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['marketing-segment', id],
    queryFn: async () => {
      if (!id || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('marketing_segments')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return mapSegment(data);
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      filterRules: SegmentFilterRules;
      isDynamic?: boolean;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user || !currentWorkspace?.id) {
        throw new Error('Não autenticado');
      }

      const { data: result, error } = await supabase
        .from('marketing_segments')
        .insert([{
          workspace_id: currentWorkspace.id,
          name: data.name,
          description: data.description,
          filter_rules: JSON.parse(JSON.stringify(data.filterRules)),
          is_dynamic: data.isDynamic ?? true,
          created_by: user.user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return mapSegment(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-segments'] });
      toast.success('Segmento criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating segment:', error);
      toast.error('Erro ao criar segmento');
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      filterRules?: SegmentFilterRules;
      isDynamic?: boolean;
    }) => {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.filterRules !== undefined) updateData.filter_rules = data.filterRules;
      if (data.isDynamic !== undefined) updateData.is_dynamic = data.isDynamic;

      const { data: result, error } = await supabase
        .from('marketing_segments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return mapSegment(result);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-segments'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-segment', variables.id] });
      toast.success('Segmento atualizado');
    },
    onError: (error) => {
      console.error('Error updating segment:', error);
      toast.error('Erro ao atualizar segmento');
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_segments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-segments'] });
      toast.success('Segmento eliminado');
    },
    onError: (error) => {
      console.error('Error deleting segment:', error);
      toast.error('Erro ao eliminar segmento');
    },
  });
}

// Helper function to count segment entities without fetching all data
type SegmentEntityType = 'contact' | 'lead' | 'company';

const SEGMENT_FIELDS_BY_ENTITY: Record<SegmentEntityType, Set<string>> = {
  contact: new Set(['email', 'tags', 'company', 'job_title', 'city', 'source']),
  lead: new Set(['email', 'tags', 'company', 'city', 'source']),
  company: new Set(['email', 'tags', 'company', 'city', 'source']),
};

function applySegmentConditions(
  query: any,
  conditions: SegmentFilterRules['conditions'] | undefined,
  entityType: SegmentEntityType
) {
  for (const condition of conditions || []) {
    const field = condition.field;
    const isSupportedField = SEGMENT_FIELDS_BY_ENTITY[entityType].has(field);

    if (!isSupportedField) continue;

    const value = typeof condition.value === 'string' ? condition.value.trim() : '';

    if (field === 'tags') {
      switch (condition.operator) {
        case 'contains':
          if (value) query = query.contains('tags', [value]);
          break;
        case 'not_contains':
          if (value) query = query.not('tags', 'cs', `{${value}}`);
          break;
        case 'is_empty':
          query = query.or('tags.is.null,tags.eq.{}');
          break;
        case 'is_not_empty':
          query = query.not('tags', 'is', null).neq('tags', '{}');
          break;
      }
      continue;
    }

    switch (condition.operator) {
      case 'equals':
        if (value) query = query.eq(field, value);
        break;
      case 'not_equals':
        if (value) query = query.neq(field, value);
        break;
      case 'contains':
        if (value) query = query.ilike(field, `%${value}%`);
        break;
      case 'not_contains':
        if (value) query = query.not(field, 'ilike', `%${value}%`);
        break;
      case 'is_empty':
        query = query.or(`${field}.is.null,${field}.eq.""`);
        break;
      case 'is_not_empty':
        query = query.not(field, 'is', null).neq(field, '');
        break;
    }
  }

  return query;
}

export async function countSegmentEntities(
  workspaceId: string,
  filterRules: SegmentFilterRules
): Promise<number> {
  let totalCount = 0;
  const conditions = filterRules?.conditions;

  let contactsQuery = supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);
  contactsQuery = applySegmentConditions(contactsQuery, conditions, 'contact');
  const { count: contactsCount, error: contactsError } = await contactsQuery;
  if (contactsError) throw contactsError;
  totalCount += contactsCount || 0;

  let leadsQuery = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);
  leadsQuery = applySegmentConditions(leadsQuery, conditions, 'lead');
  const { count: leadsCount, error: leadsError } = await leadsQuery;
  if (leadsError) throw leadsError;
  totalCount += leadsCount || 0;

  let companiesQuery = supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);
  companiesQuery = applySegmentConditions(companiesQuery, conditions, 'company');
  const { count: companiesCount, error: companiesError } = await companiesQuery;
  if (companiesError) throw companiesError;
  totalCount += companiesCount || 0;

  return totalCount;
}

// Hook to get live count for a segment
export function useSegmentLiveCount(segment: { id: string; filterRules: SegmentFilterRules } | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['segment-live-count', segment?.id, JSON.stringify(segment?.filterRules ?? {})],
    queryFn: async () => {
      if (!segment || !currentWorkspace?.id) return 0;
      const count = await countSegmentEntities(currentWorkspace.id, segment.filterRules);
      
      // Update the stored count
      await supabase
        .from('marketing_segments')
        .update({ contact_count: count })
        .eq('id', segment.id);
      
      return count;
    },
    enabled: !!segment && !!currentWorkspace?.id,
    staleTime: 30000,
  });
}

export interface SegmentEntity {
  id: string;
  name: string;
  email: string | null;
  type: SegmentEntityType;
}

export function useSegmentContacts(segmentId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['segment-contacts', currentWorkspace?.id, segmentId],
    queryFn: async () => {
      if (!segmentId || !currentWorkspace?.id) return { contacts: [], count: 0 };

      const { data: segment, error: segmentError } = await supabase
        .from('marketing_segments')
        .select('filter_rules')
        .eq('id', segmentId)
        .single();

      if (segmentError) throw segmentError;
      if (!segment) return { contacts: [], count: 0 };

      const rules = segment.filter_rules as unknown as SegmentFilterRules;
      const allEntities: SegmentEntity[] = [];

      let contactsQuery = supabase
        .from('contacts')
        .select('id, name, email')
        .eq('workspace_id', currentWorkspace.id);
      contactsQuery = applySegmentConditions(contactsQuery, rules?.conditions, 'contact');
      const { data: contacts, error: contactsError } = await contactsQuery.limit(1000);
      if (contactsError) throw contactsError;
      if (contacts) {
        allEntities.push(...contacts.map(c => ({ ...c, type: 'contact' as const })));
      }

      let leadsQuery = supabase
        .from('leads')
        .select('id, name, email')
        .eq('workspace_id', currentWorkspace.id);
      leadsQuery = applySegmentConditions(leadsQuery, rules?.conditions, 'lead');
      const { data: leads, error: leadsError } = await leadsQuery.limit(1000);
      if (leadsError) throw leadsError;
      if (leads) {
        allEntities.push(...leads.map(l => ({ ...l, type: 'lead' as const })));
      }

      let companiesQuery = supabase
        .from('companies')
        .select('id, name, email')
        .eq('workspace_id', currentWorkspace.id);
      companiesQuery = applySegmentConditions(companiesQuery, rules?.conditions, 'company');
      const { data: companies, error: companiesError } = await companiesQuery.limit(1000);
      if (companiesError) throw companiesError;
      if (companies) {
        allEntities.push(...companies.map(c => ({ ...c, type: 'company' as const })));
      }

      const sortedEntities = allEntities.sort((a, b) => a.name.localeCompare(b.name, 'pt'));

      await supabase
        .from('marketing_segments')
        .update({ contact_count: sortedEntities.length })
        .eq('id', segmentId);

      return {
        contacts: sortedEntities,
        count: sortedEntities.length,
      };
    },
    enabled: !!segmentId && !!currentWorkspace?.id,
  });
}
