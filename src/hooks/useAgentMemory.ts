import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { 
  EntityMemory, 
  MemoryType, 
  MemoryCategory,
  MemoryStats,
  StoreMemoryRequest,
  ValidateMemoryRequest 
} from "@/types/agentMemory";

interface UseAgentMemoryOptions {
  enabled?: boolean;
  onStoreSuccess?: (memoryId: string) => void;
  onValidateSuccess?: () => void;
}

/**
 * Hook for managing entity-level AI agent memories
 * 
 * Usage:
 * const { memories, storeMemory, validateMemory, stats } = useAgentMemory(entityId, entityType);
 */
export function useAgentMemory(
  entityId: string | undefined,
  entityType: string,
  options: UseAgentMemoryOptions = {}
) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch memories for this entity
  const { data: memories, isLoading, error } = useQuery({
    queryKey: ['agent-memories', workspaceId, entityId, entityType],
    queryFn: async (): Promise<EntityMemory[]> => {
      if (!entityId || !workspaceId) return [];

      const { data, error } = await supabase
        .from('ai_agent_memory')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .is('superseded_by', null)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        workspaceId: m.workspace_id,
        entityId: m.entity_id,
        entityType: m.entity_type,
        memoryType: m.memory_type as MemoryType,
        memoryCategory: (m.memory_category || 'general') as MemoryCategory,
        content: m.content,
        relevanceScore: m.relevance_score || 0.5,
        sourceType: (m.source_type || 'agent_conclusion') as any,
        sourceExecutionId: m.source_execution_id || undefined,
        isValidated: m.is_validated || false,
        validatedBy: m.validated_by || undefined,
        validatedAt: m.validated_at || undefined,
        version: m.version || 1,
        supersededBy: m.superseded_by || undefined,
        accessCount: m.access_count || 0,
        lastAccessedAt: m.last_accessed_at || undefined,
        expiresAt: m.expires_at || undefined,
        createdAt: m.created_at,
        createdBy: m.created_by || undefined,
      }));
    },
    enabled: !!entityId && !!workspaceId && options.enabled !== false,
  });

  // Fetch memory stats
  const { data: stats } = useQuery({
    queryKey: ['agent-memory-stats', workspaceId, entityId, entityType],
    queryFn: async (): Promise<MemoryStats | null> => {
      if (!entityId || !workspaceId) return null;

      const { data, error } = await supabase.functions.invoke('ai-memory-manager/stats', {
        body: { workspaceId, entityId, entityType }
      });

      if (error) {
        console.warn('Failed to fetch memory stats:', error);
        return null;
      }

      return data?.stats || null;
    },
    enabled: !!entityId && !!workspaceId && options.enabled !== false,
  });

  // Store new memory mutation
  const storeMutation = useMutation({
    mutationFn: async (request: Omit<StoreMemoryRequest, 'workspaceId' | 'entityId' | 'entityType'>) => {
      if (!entityId || !workspaceId) {
        throw new Error('Entity ID e Workspace ID são obrigatórios');
      }

      const { data, error } = await supabase.functions.invoke('ai-memory-manager/store', {
        body: {
          workspaceId,
          entityId,
          entityType,
          ...request
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao guardar memória');

      return data.memoryId as string;
    },
    onSuccess: (memoryId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memories', workspaceId, entityId, entityType] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memory-stats', workspaceId, entityId, entityType] 
      });
      toast.success('Memória guardada');
      options.onStoreSuccess?.(memoryId);
    },
    onError: (error: Error) => {
      toast.error('Erro ao guardar memória', { description: error.message });
    },
  });

  // Validate memory mutation
  const validateMutation = useMutation({
    mutationFn: async ({ memoryId, isValid }: ValidateMemoryRequest) => {
      const { data, error } = await supabase.functions.invoke('ai-memory-manager/validate', {
        body: { memoryId, isValid }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao validar memória');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memories', workspaceId, entityId, entityType] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memory-stats', workspaceId, entityId, entityType] 
      });
      toast.success('Memória validada');
      options.onValidateSuccess?.();
    },
    onError: (error: Error) => {
      toast.error('Erro ao validar memória', { description: error.message });
    },
  });

  // Delete memory mutation
  const deleteMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const { error } = await supabase
        .from('ai_agent_memory')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', memoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memories', workspaceId, entityId, entityType] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memory-stats', workspaceId, entityId, entityType] 
      });
      toast.success('Memória removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover memória', { description: error.message });
    },
  });

  // Consolidate memories mutation
  const consolidateMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID é obrigatório');

      const { data, error } = await supabase.functions.invoke('ai-memory-manager/consolidate', {
        body: { workspaceId, entityId, entityType }
      });

      if (error) throw error;
      return data?.consolidated || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memories', workspaceId, entityId, entityType] 
      });
      if (count > 0) {
        toast.success(`${count} memórias consolidadas`);
      } else {
        toast.info('Nenhuma memória para consolidar');
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao consolidar', { description: error.message });
    },
  });

  // Computed stats
  const memoryCount = memories?.length || 0;
  const validatedCount = memories?.filter(m => m.isValidated).length || 0;
  const averageRelevance = memories && memories.length > 0
    ? memories.reduce((sum, m) => sum + m.relevanceScore, 0) / memories.length
    : 0;

  return {
    // Data
    memories: memories || [],
    stats,
    
    // Loading states
    isLoading,
    isStoring: storeMutation.isPending,
    isValidating: validateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isConsolidating: consolidateMutation.isPending,
    
    // Actions
    storeMemory: (
      memoryType: MemoryType, 
      content: string, 
      relevanceScore?: number,
      memoryCategory?: MemoryCategory
    ) => storeMutation.mutateAsync({ 
      memoryType, 
      content, 
      relevanceScore,
      memoryCategory 
    }),
    
    validateMemory: (memoryId: string, isValid: boolean) => 
      validateMutation.mutateAsync({ memoryId, isValid }),
    
    deleteMemory: deleteMutation.mutateAsync,
    consolidateMemories: consolidateMutation.mutateAsync,
    
    // Computed
    memoryCount,
    validatedCount,
    averageRelevance,
    
    // Error
    error,
  };
}

/**
 * Hook to store a memory from an agent execution
 */
export function useStoreAgentMemory() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: StoreMemoryRequest) => {
      const { data, error } = await supabase.functions.invoke('ai-memory-manager/store', {
        body: request
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao guardar memória');

      return data.memoryId as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['agent-memories', variables.workspaceId, variables.entityId, variables.entityType] 
      });
    },
  });
}
