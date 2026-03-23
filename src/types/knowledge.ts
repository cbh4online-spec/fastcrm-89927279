export interface KnowledgeDocument {
  id: string;
  workspace_id: string;
  knowledge_base_id: string;
  name: string;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  source_url: string | null;
  raw_text: string | null;
  chunk_count: number;
  status: 'pending' | 'processing' | 'embedding' | 'ready' | 'error';
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  workspace_id: string;
  knowledge_base_id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  token_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SemanticSearchResult {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  token_count: number | null;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface RAGQueryResult {
  answer: string;
  sources: Array<{
    document_id: string;
    content: string;
    similarity: number;
  }>;
  confidence: number;
  responseTimeMs: number;
}
