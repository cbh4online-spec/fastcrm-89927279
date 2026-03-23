

## Implementação do Knowledge Base Module — Vectorial RAG

### Estado actual vs. o que o documento pede

**Existe hoje:**
- Tabela `knowledge_bases` com schema diferente (type, is_active, allowed_channels — sem icon, color, document_count, chunk_count)
- Tabelas `knowledge_entries` e `knowledge_sources` (sistema texto/FAQ antigo)
- Edge functions `knowledge-document-process`, `knowledge-semantic-search`, `knowledge-query` — mas usam busca textual simples via Lovable AI, não pgvector
- Não existe `knowledge-embedding` edge function
- Não existem tabelas `knowledge_documents` nem `knowledge_chunks`
- Não existe RPC `match_knowledge_chunks`
- UI actual (`KnowledgeBaseModule`) usa o sistema antigo (entradas, fontes, personas)

**O que falta (documento):**
- Tabelas `knowledge_documents` e `knowledge_chunks` (com pgvector `vector(1536)`)
- Extensão `pgvector` + índice HNSW
- RPC `match_knowledge_chunks` para busca por similaridade
- Edge function `knowledge-embedding` (OpenAI text-embedding-3-small)
- Reescrita de `knowledge-document-process` (extracção + chunking)
- Reescrita de `knowledge-semantic-search` (busca vectorial)
- Reescrita de `knowledge-query` (RAG: vectores → Claude)
- Storage bucket `knowledge-documents`
- Novos hooks (`useKnowledgeBases`, `useKnowledgeDocuments`, `useUploadDocument`, etc.)
- UI nova com upload drag-and-drop, status em tempo real, pesquisa semântica e RAG

---

### Plano de implementação

#### Fase 1 — Migration SQL

Sem alterar `knowledge_bases` existente (coexistência), criar:
- Extensão `vector` (pgvector)
- `knowledge_documents` (id, workspace_id, knowledge_base_id FK, name, file_path, file_type, file_size, source_url, raw_text, chunk_count, status, error_message, metadata, created_by, created_at, updated_at)
- `knowledge_chunks` (id, workspace_id, knowledge_base_id FK, document_id FK, content, embedding vector(1536), chunk_index, token_count, metadata, created_at)
- Índice HNSW em `knowledge_chunks.embedding`
- RLS em ambas (workspace_members isolation)
- Triggers `updated_at`, `sync_knowledge_base_doc_count`, `sync_chunk_counts`
- Adicionar `document_count` e `chunk_count` a `knowledge_bases` (ALTER TABLE)
- RPC `match_knowledge_chunks` (busca vectorial)
- Storage bucket `knowledge-documents` (privado)

#### Fase 2 — Edge Function `knowledge-embedding` (nova)

Criar `supabase/functions/knowledge-embedding/index.ts`:
- Busca chunks sem embedding para um document_id
- Gera embeddings via OpenAI `text-embedding-3-small` (batch 100)
- Actualiza cada chunk com o vector
- Marca documento como `ready`
- Requer secret `OPENAI_API_KEY`

#### Fase 3 — Reescrever `knowledge-document-process`

- Manter interface actual (sourceId/filePath/fileName) + suportar novo formato (document_id)
- Download do ficheiro do Storage → extracção de texto (PDF, TXT, MD)
- Chunking recursivo (512 tokens, 50 overlap)
- Inserção de chunks em `knowledge_chunks`
- Invocar `knowledge-embedding` assincronamente
- Coexistência: manter lógica antiga para `knowledge_sources`, adicionar path para `knowledge_documents`

#### Fase 4 — Reescrever `knowledge-semantic-search`

- Aceitar `knowledge_base_id` + `workspace_id` + `query`
- Gerar embedding da query via OpenAI
- Chamar RPC `match_knowledge_chunks`
- Retornar chunks ordenados por similaridade
- Manter endpoint antigo (text search) como fallback

#### Fase 5 — Reescrever `knowledge-query` (RAG)

- Chamar `knowledge-semantic-search` vectorial
- Montar contexto com os top chunks
- Gerar resposta via Lovable AI (gemini-2.5-pro) em vez de Anthropic directo
- Suporte streaming (SSE)
- Retornar answer + sources + tokens

#### Fase 6 — Tipos + Hooks React

- `src/types/knowledge.ts` — KnowledgeDocument, KnowledgeChunk, SemanticSearchResult, RAGQueryResult
- `src/hooks/useKnowledgeDocuments.ts` — CRUD docs, upload, polling 3s enquanto processing
- Actualizar `src/hooks/useKnowledgeBases.ts` — expor document_count/chunk_count

#### Fase 7 — UI (tab "Documentos" no KnowledgeBaseModule)

- Nova sub-tab "Documentos" no detalhe de KB (ao lado de Entradas/Fontes/Adicionar)
- `DocumentList` com cards de status (pending/processing/ready/error)
- `UploadZone` drag-and-drop (.pdf, .txt, .md, .docx)
- `URLIngestForm` para ingestão de URLs
- `KnowledgeQueryPanel` com 2 tabs: "Pesquisa semântica" (resultados com barra de similaridade) e "Perguntar à base" (RAG com markdown)

---

### Detalhes técnicos

- **pgvector**: usa `vector(1536)` com índice HNSW `(m=16, ef_construction=64)` e operador `vector_cosine_ops`
- **Embeddings**: OpenAI `text-embedding-3-small` — requer `OPENAI_API_KEY` nos secrets
- **RAG LLM**: Usa Lovable AI (gemini-2.5-pro) em vez de Anthropic — sem API key extra
- **Coexistência**: O sistema antigo (knowledge_entries/sources) continua funcional. Os novos documentos vectoriais são uma camada adicional
- **Polling**: `refetchInterval: 3000` enquanto houver docs com status `pending`/`processing`
- **Storage**: paths `{workspace_id}/{knowledge_base_id}/{uuid}.{ext}`

