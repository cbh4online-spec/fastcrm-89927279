import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { KnowledgeDocument, SemanticSearchResult, RAGQueryResult } from '@/types/knowledge';

export function useKnowledgeDocuments(knowledgeBaseId: string | null) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch documents for this KB
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['knowledge_documents', knowledgeBaseId, workspaceId],
    queryFn: async () => {
      if (!knowledgeBaseId || !workspaceId) return [];
      const { data, error } = await (supabase
        .from('knowledge_documents' as any)
        .select('*')
        .eq('knowledge_base_id', knowledgeBaseId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as KnowledgeDocument[];
    },
    enabled: !!knowledgeBaseId && !!workspaceId,
    // Poll every 3s if any doc is pending/processing/embedding
    refetchInterval: (query) => {
      const docs = query.state.data as KnowledgeDocument[] | undefined;
      const hasPending = docs?.some(d => ['pending', 'processing', 'embedding'].includes(d.status));
      return hasPending ? 3000 : false;
    },
  });

  // Upload document
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!knowledgeBaseId || !workspaceId) throw new Error('Missing KB or workspace');

      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${workspaceId}/${knowledgeBaseId}/${crypto.randomUUID()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('knowledge-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Create document record
      const { data: doc, error: docError } = await (supabase
        .from('knowledge_documents' as any)
        .insert({
          workspace_id: workspaceId,
          knowledge_base_id: knowledgeBaseId,
          name: file.name,
          file_path: filePath,
          file_type: file.type || `application/${ext}`,
          file_size: file.size,
          status: 'pending',
          created_by: user?.id,
        } as any)
        .select()
        .single() as any);
      if (docError) throw docError;

      // Trigger processing
      await supabase.functions.invoke('knowledge-document-process', {
        body: {
          document_id: (doc as any).id,
          workspaceId,
          knowledgeBaseId,
          filePath,
          fileName: file.name,
          mimeType: file.type,
        },
      });

      return doc as KnowledgeDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_documents', knowledgeBaseId] });
      toast.success('Documento enviado para processamento');
    },
    onError: (err) => {
      toast.error(`Erro ao enviar documento: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    },
  });

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // Delete chunks first
      await (supabase.from('knowledge_chunks' as any).delete().eq('document_id', documentId) as any);
      // Delete document
      const { error } = await (supabase.from('knowledge_documents' as any).delete().eq('id', documentId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_documents', knowledgeBaseId] });
      toast.success('Documento eliminado');
    },
    onError: () => toast.error('Erro ao eliminar documento'),
  });

  // Semantic search
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const semanticSearch = useCallback(async (query: string) => {
    if (!knowledgeBaseId || !workspaceId || !query.trim()) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-semantic-search', {
        body: { query, workspaceId, knowledgeBaseId, mode: 'vector' },
      });
      if (error) throw error;
      setSearchResults(data?.results || []);
    } catch (err) {
      console.error('Semantic search error:', err);
      toast.error('Erro na pesquisa semântica');
    } finally {
      setIsSearching(false);
    }
  }, [knowledgeBaseId, workspaceId]);

  // RAG query
  const [ragResult, setRagResult] = useState<RAGQueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const ragQuery = useCallback(async (query: string) => {
    if (!knowledgeBaseId || !workspaceId || !query.trim()) return;
    setIsQuerying(true);
    setRagResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-query', {
        body: {
          query,
          workspaceId,
          knowledgeBaseId,
          mode: 'rag',
          context: 'knowledge-base',
          knowledgeEntries: [],
        },
      });
      if (error) throw error;
      setRagResult(data as RAGQueryResult);
    } catch (err) {
      console.error('RAG query error:', err);
      toast.error('Erro ao consultar a base de conhecimento');
    } finally {
      setIsQuerying(false);
    }
  }, [knowledgeBaseId, workspaceId]);

  return {
    documents,
    isLoading,
    uploadDocument: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteDocument: deleteMutation.mutateAsync,
    semanticSearch,
    searchResults,
    isSearching,
    ragQuery,
    ragResult,
    isQuerying,
    clearSearch: () => setSearchResults([]),
    clearRag: () => setRagResult(null),
  };
}
