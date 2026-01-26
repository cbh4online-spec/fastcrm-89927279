import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { 
  EntityMemory,
  StrategicMemory,
  MemoryPromptContext,
  MemoryRetrievalRequest,
  MemoryRetrievalResponse,
  MemoryType 
} from "@/types/agentMemory";

interface UseMemoryRetrievalOptions {
  autoRetrieve?: boolean;
  maxResults?: number;
  minRelevance?: number;
  includeStrategic?: boolean;
}

/**
 * Hook for semantic memory retrieval
 * 
 * Usage:
 * const { retrieve, getPromptContext, lastResult } = useMemoryRetrieval(entityId, entityType);
 * const context = await getPromptContext('What is their budget?');
 */
export function useMemoryRetrieval(
  entityId: string | undefined,
  entityType: string,
  options: UseMemoryRetrievalOptions = {}
) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const {
    autoRetrieve = false,
    maxResults = 10,
    minRelevance = 0.3,
    includeStrategic = false
  } = options;

  // Auto-retrieve on mount if enabled
  const { data: autoRetrievedData } = useQuery({
    queryKey: ['memory-auto-retrieve', workspaceId, entityId, entityType],
    queryFn: async () => {
      if (!entityId || !workspaceId) return null;

      const { data, error } = await supabase.functions.invoke('ai-memory-manager/retrieve', {
        body: {
          workspaceId,
          entityId,
          entityType,
          maxResults,
          minRelevance,
          includeStrategic
        }
      });

      if (error) throw error;
      return data as MemoryRetrievalResponse;
    },
    enabled: autoRetrieve && !!entityId && !!workspaceId,
    staleTime: 60000, // Cache for 1 minute
  });

  // Semantic retrieval mutation
  const retrieveMutation = useMutation({
    mutationFn: async (request: Partial<MemoryRetrievalRequest>): Promise<MemoryRetrievalResponse> => {
      if (!entityId || !workspaceId) {
        throw new Error('Entity ID e Workspace ID são obrigatórios');
      }

      const { data, error } = await supabase.functions.invoke('ai-memory-manager/retrieve', {
        body: {
          workspaceId,
          entityId,
          entityType,
          maxResults: request.maxResults || maxResults,
          minRelevance: request.minRelevance || minRelevance,
          includeStrategic: request.includeStrategic ?? includeStrategic,
          queryText: request.queryText,
        }
      });

      if (error) throw error;
      return data as MemoryRetrievalResponse;
    },
  });

  /**
   * Retrieve memories semantically related to a query
   */
  const retrieve = async (
    queryText?: string, 
    overrideOptions?: Partial<MemoryRetrievalRequest>
  ): Promise<MemoryRetrievalResponse> => {
    return retrieveMutation.mutateAsync({
      queryText,
      ...overrideOptions
    });
  };

  /**
   * Get formatted prompt context for agent injection
   */
  const getPromptContext = async (queryText?: string): Promise<MemoryPromptContext> => {
    const result = await retrieve(queryText, { includeStrategic: true });
    return result.promptContext;
  };

  /**
   * Format prompt context as text for LLM injection
   */
  const formatPromptContextAsText = (context: MemoryPromptContext): string => {
    const sections: string[] = [];

    if (context.knownFacts.length > 0) {
      sections.push(`### Factos Verificados:\n${context.knownFacts.map(f => `- ${f}`).join('\n')}`);
    }

    if (context.preferences.length > 0) {
      sections.push(`### Preferências Conhecidas:\n${context.preferences.map(p => `- ${p}`).join('\n')}`);
    }

    if (context.historicalPatterns.length > 0) {
      sections.push(`### Padrões Observados:\n${context.historicalPatterns.map(p => `- ${p}`).join('\n')}`);
    }

    if (context.recentSignals.length > 0) {
      sections.push(`### Sinais Recentes:\n${context.recentSignals.map(s => `- ${s}`).join('\n')}`);
    }

    if (context.risks.length > 0) {
      sections.push(`### Riscos Identificados:\n${context.risks.map(r => `- ${r}`).join('\n')}`);
    }

    if (sections.length === 0) {
      return '## Contexto Histórico\n\nSem memórias anteriores para esta entidade.';
    }

    let result = '## Contexto Histórico (Memória do Sistema)\n\n';
    result += sections.join('\n\n');
    result += '\n\n---\n';
    result += `NOTA: A informação acima é contexto histórico. Dados actuais do CRM têm precedência.\n`;
    result += `Confiança geral neste contexto: ${context.overallConfidence}`;
    
    if (context.staleDataWarning) {
      result += `\n⚠️ ${context.staleDataWarning}`;
    }

    return result;
  };

  return {
    // Retrieval
    retrieve,
    getPromptContext,
    formatPromptContextAsText,
    
    // Auto-retrieved data
    autoRetrievedMemories: autoRetrievedData?.memories || [],
    autoRetrievedContext: autoRetrievedData?.promptContext,
    
    // Last retrieval result
    lastResult: retrieveMutation.data,
    lastMemories: retrieveMutation.data?.memories || [],
    lastStrategicMemories: retrieveMutation.data?.strategicMemories || [],
    lastPromptContext: retrieveMutation.data?.promptContext,
    
    // States
    isRetrieving: retrieveMutation.isPending,
    retrieveError: retrieveMutation.error,
    
    // Helpers
    hasMemories: (autoRetrievedData?.memories?.length || 0) > 0 || 
                 (retrieveMutation.data?.memories?.length || 0) > 0,
  };
}

/**
 * Build memory context for a specific query context
 */
export function useMemoryContextBuilder() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({
      entityId,
      entityType,
      queryText,
      includeStrategic = true
    }: {
      entityId: string;
      entityType: string;
      queryText?: string;
      includeStrategic?: boolean;
    }): Promise<{
      memories: EntityMemory[];
      strategicMemories: StrategicMemory[];
      promptContext: MemoryPromptContext;
      formattedText: string;
    }> => {
      if (!workspaceId) throw new Error('Workspace não disponível');

      const { data, error } = await supabase.functions.invoke('ai-memory-manager/retrieve', {
        body: {
          workspaceId,
          entityId,
          entityType,
          queryText,
          includeStrategic,
          maxResults: 15,
          minRelevance: 0.25
        }
      });

      if (error) throw error;

      const result = data as MemoryRetrievalResponse;
      const formattedText = formatContextAsText(result.promptContext);

      return {
        memories: result.memories,
        strategicMemories: result.strategicMemories || [],
        promptContext: result.promptContext,
        formattedText
      };
    }
  });
}

// Helper function
function formatContextAsText(context: MemoryPromptContext): string {
  const sections: string[] = [];

  if (context.knownFacts.length > 0) {
    sections.push(`### Factos Verificados:\n${context.knownFacts.map(f => `- ${f}`).join('\n')}`);
  }

  if (context.preferences.length > 0) {
    sections.push(`### Preferências Conhecidas:\n${context.preferences.map(p => `- ${p}`).join('\n')}`);
  }

  if (context.historicalPatterns.length > 0) {
    sections.push(`### Padrões Observados:\n${context.historicalPatterns.map(p => `- ${p}`).join('\n')}`);
  }

  if (context.recentSignals.length > 0) {
    sections.push(`### Sinais Recentes:\n${context.recentSignals.map(s => `- ${s}`).join('\n')}`);
  }

  if (context.risks.length > 0) {
    sections.push(`### Riscos Identificados:\n${context.risks.map(r => `- ${r}`).join('\n')}`);
  }

  if (sections.length === 0) {
    return '';
  }

  let result = '## Contexto Histórico (Memória do Sistema)\n\n';
  result += sections.join('\n\n');
  result += '\n\n---\n';
  result += `Confiança: ${context.overallConfidence}`;
  
  if (context.staleDataWarning) {
    result += `\n⚠️ ${context.staleDataWarning}`;
  }

  return result;
}
