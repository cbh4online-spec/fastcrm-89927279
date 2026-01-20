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
        .insert({
          workspace_id: currentWorkspace.id,
          name: data.name,
          description: data.description,
          filter_rules: data.filterRules as unknown as Record<string, unknown>,
          is_dynamic: data.isDynamic ?? true,
          created_by: user.user.id,
        })
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

export function useSegmentContacts(segmentId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['segment-contacts', segmentId],
    queryFn: async () => {
      if (!segmentId || !currentWorkspace?.id) return { contacts: [], count: 0 };

      // Get segment rules
      const { data: segment } = await supabase
        .from('marketing_segments')
        .select('filter_rules')
        .eq('id', segmentId)
        .single();

      if (!segment) return { contacts: [], count: 0 };

      const rules = segment.filter_rules as unknown as SegmentFilterRules;
      
      // Build query based on rules
      let query = supabase
        .from('contacts')
        .select('id, name, email')
        .eq('workspace_id', currentWorkspace.id);

      // Apply conditions
      for (const condition of rules?.conditions || []) {
        const value = typeof condition.value === 'string' ? condition.value : '';
        switch (condition.field) {
          case 'tags':
            if (condition.operator === 'contains' && value) {
              query = query.contains('tags', [value]);
            }
            break;
          case 'company':
            if (condition.operator === 'equals' && value) {
              query = query.eq('company', value);
            } else if (condition.operator === 'contains' && value) {
              query = query.ilike('company', `%${value}%`);
            }
            break;
        }
      }

      const { data: contacts, error } = await query.limit(500);

      if (error) throw error;

      // Update segment contact count
      await supabase
        .from('marketing_segments')
        .update({ contact_count: contacts?.length || 0 })
        .eq('id', segmentId);

      return {
        contacts: contacts || [],
        count: contacts?.length || 0,
      };
    },
    enabled: !!segmentId && !!currentWorkspace?.id,
  });
}
