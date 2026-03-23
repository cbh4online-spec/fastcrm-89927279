import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { AISuggestion, SuggestionType, SuggestionEntityType, SuggestionHubStats } from '@/types/ai-suggestions';

const QK = 'ai-suggestions-hub';

// ── Fetch all pending suggestions for the workspace hub ──────────────────────
export function useAISuggestionsHub(filters?: {
  suggestion_type?: SuggestionType;
  entity_type?: SuggestionEntityType;
}) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: [QK, currentWorkspace?.id, filters],
    queryFn: async (): Promise<AISuggestion[]> => {
      if (!currentWorkspace?.id) return [];

      let query = (supabase
        .from('ai_field_suggestions' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'pending')
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200) as any);

      if (filters?.suggestion_type) {
        query = query.eq('suggestion_type', filters.suggestion_type);
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AISuggestion[];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ── Fetch suggestions for a specific entity (inline in detail pages) ─────────
export function useEntitySuggestions(entityType: SuggestionEntityType, entityId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: [QK, 'entity', entityType, entityId],
    queryFn: async (): Promise<AISuggestion[]> => {
      if (!entityId || !currentWorkspace?.id) return [];

      const { data, error } = await (supabase
        .from('ai_field_suggestions' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('status', 'pending')
        .order('confidence', { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as AISuggestion[];
    },
    enabled: !!entityId && !!currentWorkspace?.id,
    staleTime: 20_000,
  });
}

// ── Stats for the suggestions hub header ─────────────────────────────────────
export function useSuggestionHubStats() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: [QK, 'stats', currentWorkspace?.id],
    queryFn: async (): Promise<SuggestionHubStats> => {
      if (!currentWorkspace?.id) return { total_pending: 0, tags_pending: 0, fields_pending: 0, automations_pending: 0, accepted_last_7_days: 0, dismissed_last_7_days: 0 };

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [pendingResult, acceptedResult, dismissedResult] = await Promise.all([
        (supabase
          .from('ai_field_suggestions' as any)
          .select('suggestion_type')
          .eq('workspace_id', currentWorkspace.id)
          .eq('status', 'pending') as any),
        (supabase
          .from('ai_field_suggestions' as any)
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', currentWorkspace.id)
          .in('status', ['accepted', 'applied'])
          .gte('updated_at', sevenDaysAgo) as any),
        (supabase
          .from('ai_field_suggestions' as any)
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', currentWorkspace.id)
          .eq('status', 'dismissed')
          .gte('updated_at', sevenDaysAgo) as any),
      ]);

      const pending = (pendingResult.data || []) as Array<{ suggestion_type: string }>;
      return {
        total_pending: pending.length,
        tags_pending: pending.filter(s => s.suggestion_type === 'tag').length,
        fields_pending: pending.filter(s => s.suggestion_type === 'field_value').length,
        automations_pending: pending.filter(s => s.suggestion_type === 'automation').length,
        accepted_last_7_days: acceptedResult.count ?? 0,
        dismissed_last_7_days: dismissedResult.count ?? 0,
      };
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 60_000,
  });
}

// ── Accept a suggestion ───────────────────────────────────────────────────────
export function useAcceptSuggestionHub() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (suggestion: AISuggestion) => {
      // Mark as accepted
      await (supabase
        .from('ai_field_suggestions' as any)
        .update({ status: 'accepted', applied_at: new Date().toISOString() } as any)
        .eq('id', suggestion.id) as any);

      // Apply tag
      if (suggestion.suggestion_type === 'tag' && suggestion.entity_id && suggestion.tag_value) {
        const tableMap: Record<string, string> = {
          contact: 'contacts', lead: 'leads',
          company: 'companies', opportunity: 'opportunities',
        };
        const table = tableMap[suggestion.entity_type!];
        if (table) {
          const { data: entity } = await (supabase
            .from(table as any)
            .select('tags')
            .eq('id', suggestion.entity_id)
            .single() as any);

          const currentTags: string[] = (entity as any)?.tags ?? [];
          if (!currentTags.includes(suggestion.tag_value)) {
            await (supabase
              .from(table as any)
              .update({ tags: [...currentTags, suggestion.tag_value] } as any)
              .eq('id', suggestion.entity_id) as any);
          }

          await (supabase
            .from('ai_field_suggestions' as any)
            .update({ status: 'applied' } as any)
            .eq('id', suggestion.id) as any);
        }
      }

      // Apply field value
      if (suggestion.suggestion_type === 'field_value' && suggestion.entity_id) {
        // Field values are applied via the existing useAcceptSuggestion in useFieldSuggestions
        await (supabase
          .from('ai_field_suggestions' as any)
          .update({ status: 'applied' } as any)
          .eq('id', suggestion.id) as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast.success('Sugestão aplicada');
    },
    onError: () => toast.error('Erro ao aplicar sugestão'),
  });
}

// ── Dismiss a suggestion ──────────────────────────────────────────────────────
export function useDismissSuggestionHub() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await (supabase
        .from('ai_field_suggestions' as any)
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_reason: reason ?? null,
        } as any)
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
    },
  });
}

// ── Trigger suggestion generation on-demand ───────────────────────────────────
export function useGenerateSuggestionsHub() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (params:
      | { type: 'tags'; entity_type: SuggestionEntityType; entity_id: string }
      | { type: 'fields'; entity_type: SuggestionEntityType; entity_id: string }
      | { type: 'automations' }
    ) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      if (params.type === 'tags') {
        const { data, error } = await supabase.functions.invoke('ai-entity-tags', {
          body: { entity_type: params.entity_type, entity_id: params.entity_id, workspace_id: currentWorkspace.id },
        });
        if (error) throw error;
        return data;
      }
      if (params.type === 'fields') {
        const { data, error } = await supabase.functions.invoke('ai-field-suggestions', {
          body: { entityType: params.entity_type, entityId: params.entity_id, workspaceId: currentWorkspace.id },
        });
        if (error) throw error;
        return data;
      }
      if (params.type === 'automations') {
        const { data, error } = await supabase.functions.invoke('ai-automation-suggestions', {
          body: { workspaceId: currentWorkspace.id },
        });
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, params) => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: [QK] });
      }, 800);
      const label = params.type === 'tags' ? 'Tags' : params.type === 'fields' ? 'Campos' : 'Automações';
      toast.success(`Sugestões de ${label} geradas`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao gerar sugestões: ${err.message}`);
    },
  });
}
