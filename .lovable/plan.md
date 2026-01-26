
# Retrieval-Augmented Reasoning (RAG) Layer

## Resumo Executivo

Implementar uma camada de RAG controlada e determinística que permite aos agentes AI do CRM enriquecer as suas análises com conhecimento histórico relevante - comparando entidades atuais com casos similares do passado e justificando recomendações com evidência concreta.

---

## Diagnóstico do Estado Atual

### Infraestrutura Existente

| Componente | Estado | Utilização para RAG |
|------------|--------|---------------------|
| `knowledge_entries` | Implementado | Base de conhecimento com embeddings (pgvector) |
| `knowledge-semantic-search` | Implementado | Busca semântica em FAQs |
| `ai_agent_memory` | Implementado | Memória por entidade com embeddings |
| `ai_agent_strategic_memory` | Implementado | Padrões cross-entity |
| `match_knowledge_entries` | Implementado | Função SQL para similarity search |
| `retrieve_entity_memories` | Implementado | Retrieval de memórias por entidade |
| Context Control Layer | Implementado | Gestão de token budgets |
| Cache Layer | Implementado | Response caching |

### Lacunas Identificadas

1. **Sem retrieval de casos históricos similares** - Não compara entidades atuais com passadas
2. **Sem outcomes tracking** - Oportunidades ganhas/perdidas não são indexadas para RAG
3. **Sem chunking semântico** - Embeddings são por documento inteiro
4. **Sem hierarchical retrieval** - Single-pass sem re-ranking
5. **Sem hybrid search** - Apenas similarity semântica, sem keyword matching
6. **Sem RAG guardrails** - Não há controlo de qualidade de retrieval

---

## Arquitetura do RAG Layer

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAG OPTIMIZATION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌─────────────────┐  │
│  │     KNOWLEDGE        │   │    HISTORICAL        │   │    STRATEGIC    │  │
│  │     SOURCES          │   │    OUTCOMES          │   │    PATTERNS     │  │
│  │  (knowledge_entries) │   │   (opportunities)    │   │ (strategic_mem) │  │
│  └──────────────────────┘   └──────────────────────┘   └─────────────────┘  │
│            │                         │                         │             │
│            └─────────────────────────┼─────────────────────────┘             │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        SEMANTIC CHUNKER                                 │ │
│  │    • Topic-based chunking  • Metadata extraction  • Quality scoring    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    HIERARCHICAL RETRIEVAL                               │ │
│  │  ┌─────────────────────┐         ┌─────────────────────┐               │ │
│  │  │   COARSE RETRIEVAL  │  ───▶   │   FINE RETRIEVAL    │               │ │
│  │  │   (top-k by type)   │         │   (re-ranking)      │               │ │
│  │  └─────────────────────┘         └─────────────────────┘               │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       HYBRID SEARCH ENGINE                              │ │
│  │   Semantic (embeddings)  +  Keyword (full-text)  +  Metadata (filters) │ │
│  │                    Weighted combination scoring                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                     CONTEXT INJECTION LAYER                             │ │
│  │   • Separação de live data vs retrieved  • Labeled as "historical"     │ │
│  │   • Token budget compliance  • Relevance threshold enforcement          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componente 1: Historical Outcomes Index

### Objetivo
Indexar oportunidades ganhas/perdidas para retrieval de casos similares.

### Tabela Nova: `rag_historical_outcomes`

```sql
CREATE TABLE rag_historical_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL,
  source_entity_type TEXT NOT NULL, -- 'opportunity', 'lead'
  
  -- Outcome data
  outcome TEXT NOT NULL, -- 'won', 'lost', 'stalled', 'converted'
  outcome_reason TEXT,
  outcome_value NUMERIC,
  outcome_date TIMESTAMP WITH TIME ZONE,
  
  -- Context for matching
  entity_snapshot JSONB NOT NULL, -- Key fields at outcome time
  industry TEXT,
  company_size TEXT,
  deal_cycle_days INTEGER,
  initial_stage TEXT,
  final_stage TEXT,
  
  -- Derived insights
  success_factors TEXT[], -- What contributed to win
  failure_factors TEXT[], -- What contributed to loss
  lessons_learned TEXT,
  
  -- Embedding for semantic search
  embedding vector(1536),
  embedding_text TEXT, -- Text that was embedded
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  indexed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_rag_outcomes_workspace ON rag_historical_outcomes(workspace_id);
CREATE INDEX idx_rag_outcomes_outcome ON rag_historical_outcomes(workspace_id, outcome);
CREATE INDEX idx_rag_outcomes_embedding ON rag_historical_outcomes 
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);
```

---

## Componente 2: Semantic Chunker

### Objetivo
Dividir conteúdo em chunks por significado, não por tamanho fixo.

### Estratégia de Chunking

| Source | Chunk Strategy | Metadata |
|--------|----------------|----------|
| Knowledge entries | By section/paragraph | entry_type, category, keywords |
| Historical outcomes | By outcome + factors | outcome, industry, value_range |
| Strategic memory | By pattern type | pattern_type, entity_types |
| Agent conclusions | By conclusion type | memory_type, confidence |

### Implementação

```text
Ficheiro: supabase/functions/_shared/rag-chunker.ts

Responsabilidades:
- Detetar limites de tópico via similarity entre sentenças
- Respeitar estrutura documental (headers, listas)
- Extrair metadata por chunk
- Calcular quality score por chunk
- Gerar embedding por chunk
```

---

## Componente 3: Hierarchical Retrieval

### Objetivo
Retrieval em duas fases para melhorar precisão.

### Fase 1: Coarse Retrieval

```text
1. Receber query + entity context
2. Filtrar por metadata:
   - workspace_id
   - entity_type relevante
   - outcome relevante (para opportunities)
   - recency (últimos 12 meses)
3. Buscar top-K candidatos por categoria:
   - 10 historical outcomes
   - 5 strategic patterns
   - 5 knowledge entries
```

### Fase 2: Fine Retrieval

```text
1. Re-rank candidatos por:
   - Semantic similarity to current entity
   - Recency boost
   - Outcome relevance (won > lost for similar cases)
   - Confidence/validation status
2. Aplicar relevance threshold (0.6 mínimo)
3. Selecionar top-5 final respeitando token budget
```

---

## Componente 4: Hybrid Search Engine

### Objetivo
Combinar busca semântica com keyword matching.

### Pesos de Scoring

```typescript
interface HybridSearchWeights {
  semantic: 0.6;       // Embedding similarity
  keyword: 0.25;       // Full-text match
  metadata: 0.15;      // Filter match bonus
}
```

### Implementação

```text
Ficheiro: supabase/functions/_shared/rag-hybrid-search.ts

Responsabilidades:
- Executar vector similarity search
- Executar full-text search
- Combinar resultados com weighted scoring
- Aplicar metadata filters
- Deduplicate e rank final
```

---

## Componente 5: Context Injection Layer

### Objetivo
Injetar contexto RAG de forma controlada e rotulada.

### Formato de Injeção

```text
═══════════════════════════════════════════════════════════════
📊 EVIDÊNCIA HISTÓRICA (não confundir com dados atuais)
═══════════════════════════════════════════════════════════════

## Casos Similares Relevantes:

### 1. Oportunidade GANHA (similaridade: 87%)
- Indústria: SaaS B2B
- Valor: €45,000
- Ciclo: 45 dias
- Fator de sucesso: Demo técnica personalizada
- Relevância: Este caso tinha perfil de decisor similar

### 2. Oportunidade PERDIDA (similaridade: 82%)
- Indústria: SaaS B2B
- Valor: €38,000
- Motivo: Preço (competidor mais barato)
- Lição: Importante demonstrar ROI early

## Padrões Identificados:
- Leads deste setor convertem 40% melhor com follow-up em 48h
- Objeção de preço resolve-se com case study de ROI

═══════════════════════════════════════════════════════════════
```

### Regras de Injeção

1. **Separação clara** - Evidência histórica nunca se mistura com dados ao vivo
2. **Labeling explícito** - Sempre indicar "HISTÓRICO" ou "PADRÃO"
3. **Similarity scores** - Sempre mostrar % de similaridade
4. **Token budget** - RAG context limitado a 20% do budget total
5. **Threshold mínimo** - Só injetar se relevance >= 0.6

---

## Componente 6: RAG Guardrails

### Tipos de Guardrails

```typescript
export interface RAGGuardrails {
  // Retrieval limits
  maxRetrievedChunks: number;           // 20
  maxFinalContextChunks: number;        // 5
  relevanceThreshold: number;           // 0.6
  
  // Token budgets
  maxRAGContextTokens: number;          // 20% of agent budget
  maxChunkTokens: number;               // 500 tokens per chunk
  
  // Quality controls
  minChunkQualityScore: number;         // 0.5
  requireOutcomeForOpportunities: true; // Only retrieve closed deals
  
  // Safety
  neverOverrideLiveData: true;
  alwaysLabelAsHistorical: true;
  logAllRetrievals: true;
}
```

### Anti-Patterns Prevenidos

| Anti-Pattern | Prevenção |
|--------------|-----------|
| Fixed chunk sizes | Semantic chunking enforced |
| Embedding everything | Quality filter before embedding |
| Blind injection | Relevance threshold + labeling |
| First-pass only | Two-stage retrieval |
| Maximize context | Token budget + relevance limits |

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/functions/_shared/rag-types.ts` | Type definitions para RAG |
| `supabase/functions/_shared/rag-chunker.ts` | Semantic chunking logic |
| `supabase/functions/_shared/rag-retriever.ts` | Hierarchical retrieval |
| `supabase/functions/_shared/rag-hybrid-search.ts` | Hybrid search engine |
| `supabase/functions/_shared/rag-context-builder.ts` | Context injection |
| `supabase/functions/_shared/rag-guardrails.ts` | Guardrails & validation |
| `supabase/functions/rag-index-outcome/index.ts` | Index opportunity outcomes |
| `supabase/functions/rag-search/index.ts` | Unified RAG search endpoint |
| `src/types/ragLayer.ts` | Frontend type definitions |
| `src/lib/aiSafetyRules.ts` | Add RAG guardrails |

---

## Ficheiros a Modificar

| Ficheiro | Modificação |
|----------|-------------|
| `ai-agent-orchestrator/index.ts` | Integrate RAG retrieval |
| `ai-agent-opportunity/index.ts` | Add historical comparison |
| `ai-agent-client/index.ts` | Add pattern retrieval |
| `context-collector.ts` | Add RAG source type |
| `prompt-assembler.ts` | Add RAG context section |

---

## Migração de Base de Dados

```sql
-- Tabela principal de outcomes
CREATE TABLE rag_historical_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL,
  source_entity_type TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost', 'stalled', 'converted', 'churned')),
  outcome_reason TEXT,
  outcome_value NUMERIC,
  outcome_date TIMESTAMP WITH TIME ZONE,
  entity_snapshot JSONB NOT NULL,
  industry TEXT,
  company_size TEXT,
  deal_cycle_days INTEGER,
  initial_stage TEXT,
  final_stage TEXT,
  success_factors TEXT[],
  failure_factors TEXT[],
  lessons_learned TEXT,
  embedding vector(1536),
  embedding_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  indexed_at TIMESTAMP WITH TIME ZONE
);

-- Tabela de chunks indexados
CREATE TABLE rag_indexed_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_content TEXT NOT NULL,
  chunk_metadata JSONB,
  quality_score NUMERIC DEFAULT 1.0,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(source_table, source_id, chunk_index)
);

-- Tabela de métricas RAG
CREATE TABLE rag_retrieval_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  query_type TEXT NOT NULL,
  chunks_retrieved INTEGER,
  chunks_used INTEGER,
  avg_relevance_score NUMERIC,
  retrieval_time_ms INTEGER,
  context_tokens_used INTEGER,
  query_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_rag_outcomes_workspace ON rag_historical_outcomes(workspace_id);
CREATE INDEX idx_rag_outcomes_type ON rag_historical_outcomes(workspace_id, outcome);
CREATE INDEX idx_rag_outcomes_embedding ON rag_historical_outcomes 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_rag_chunks_source ON rag_indexed_chunks(source_table, source_id);
CREATE INDEX idx_rag_chunks_embedding ON rag_indexed_chunks 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_rag_metrics_lookup ON rag_retrieval_metrics(workspace_id, agent_type, query_date);

-- Função de similarity search para outcomes
CREATE OR REPLACE FUNCTION match_historical_outcomes(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_workspace_id uuid,
  filter_outcome text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_entity_id uuid,
  source_entity_type text,
  outcome text,
  outcome_reason text,
  outcome_value numeric,
  entity_snapshot jsonb,
  success_factors text[],
  failure_factors text[],
  lessons_learned text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ho.id,
    ho.source_entity_id,
    ho.source_entity_type,
    ho.outcome,
    ho.outcome_reason,
    ho.outcome_value,
    ho.entity_snapshot,
    ho.success_factors,
    ho.failure_factors,
    ho.lessons_learned,
    1 - (ho.embedding <-> query_embedding) as similarity
  FROM rag_historical_outcomes ho
  WHERE ho.workspace_id = filter_workspace_id
    AND ho.embedding IS NOT NULL
    AND (filter_outcome IS NULL OR ho.outcome = filter_outcome)
    AND 1 - (ho.embedding <-> query_embedding) > match_threshold
  ORDER BY ho.embedding <-> query_embedding
  LIMIT match_count;
END;
$$;

-- Função para busca híbrida
CREATE OR REPLACE FUNCTION rag_hybrid_search(
  query_text text,
  query_embedding vector(1536),
  filter_workspace_id uuid,
  semantic_weight float DEFAULT 0.6,
  keyword_weight float DEFAULT 0.25,
  metadata_weight float DEFAULT 0.15,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  source_table text,
  source_id uuid,
  chunk_content text,
  chunk_metadata jsonb,
  semantic_score float,
  keyword_score float,
  combined_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT 
      c.source_table,
      c.source_id,
      c.chunk_content,
      c.chunk_metadata,
      1 - (c.embedding <-> query_embedding) as semantic_score
    FROM rag_indexed_chunks c
    WHERE c.workspace_id = filter_workspace_id
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <-> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT
      c.source_table,
      c.source_id,
      c.chunk_content,
      c.chunk_metadata,
      ts_rank(to_tsvector('portuguese', c.chunk_content), plainto_tsquery('portuguese', query_text)) as keyword_score
    FROM rag_indexed_chunks c
    WHERE c.workspace_id = filter_workspace_id
      AND to_tsvector('portuguese', c.chunk_content) @@ plainto_tsquery('portuguese', query_text)
    ORDER BY keyword_score DESC
    LIMIT match_count * 2
  )
  SELECT 
    COALESCE(s.source_table, k.source_table) as source_table,
    COALESCE(s.source_id, k.source_id) as source_id,
    COALESCE(s.chunk_content, k.chunk_content) as chunk_content,
    COALESCE(s.chunk_metadata, k.chunk_metadata) as chunk_metadata,
    COALESCE(s.semantic_score, 0) as semantic_score,
    COALESCE(k.keyword_score, 0) as keyword_score,
    (COALESCE(s.semantic_score, 0) * semantic_weight + 
     COALESCE(k.keyword_score, 0) * keyword_weight) as combined_score
  FROM semantic_results s
  FULL OUTER JOIN keyword_results k 
    ON s.source_table = k.source_table AND s.source_id = k.source_id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- RLS Policies
ALTER TABLE rag_historical_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_indexed_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_retrieval_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can access outcomes" ON rag_historical_outcomes
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace members can access chunks" ON rag_indexed_chunks
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Workspace members can view metrics" ON rag_retrieval_metrics
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Trigger para indexar outcomes quando oportunidade fecha
CREATE OR REPLACE FUNCTION index_opportunity_outcome()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to won/lost
  IF NEW.status IN ('won', 'lost') AND (OLD.status IS NULL OR OLD.status NOT IN ('won', 'lost')) THEN
    INSERT INTO rag_historical_outcomes (
      workspace_id,
      source_entity_id,
      source_entity_type,
      outcome,
      outcome_reason,
      outcome_value,
      outcome_date,
      entity_snapshot,
      initial_stage,
      final_stage
    ) VALUES (
      NEW.workspace_id,
      NEW.id,
      'opportunity',
      NEW.status,
      NEW.lost_reason,
      NEW.value,
      now(),
      jsonb_build_object(
        'title', NEW.title,
        'value', NEW.value,
        'probability', NEW.probability,
        'source', NEW.source,
        'notes', NEW.notes,
        'ai_insight', NEW.ai_insight
      ),
      NULL, -- Would need to track initial stage
      NEW.status
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_index_opportunity_outcome
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION index_opportunity_outcome();
```

---

## Tipos TypeScript

```typescript
// src/types/ragLayer.ts

export interface RAGQuery {
  text: string;
  entityContext: {
    entityId: string;
    entityType: string;
    entityData: Record<string, unknown>;
  };
  filters?: {
    outcome?: 'won' | 'lost' | 'all';
    industry?: string;
    dateRange?: { start: string; end: string };
  };
  limits?: {
    maxChunks?: number;
    relevanceThreshold?: number;
  };
}

export interface RAGChunk {
  id: string;
  sourceTable: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  relevanceScore: number;
  chunkType: 'outcome' | 'pattern' | 'knowledge' | 'memory';
}

export interface RAGRetrievalResult {
  success: boolean;
  chunks: RAGChunk[];
  historicalOutcomes: HistoricalOutcome[];
  strategicPatterns: StrategicPattern[];
  totalRetrieved: number;
  totalUsed: number;
  avgRelevance: number;
  retrievalTimeMs: number;
}

export interface HistoricalOutcome {
  id: string;
  outcome: 'won' | 'lost' | 'stalled';
  outcomeReason?: string;
  outcomeValue?: number;
  similarity: number;
  successFactors?: string[];
  failureFactors?: string[];
  lessonsLearned?: string;
  entitySnapshot: Record<string, unknown>;
}

export interface StrategicPattern {
  id: string;
  patternType: string;
  patternDescription: string;
  occurrenceCount: number;
  confidenceScore: number;
  recommendedActions: string[];
  contraindicatedActions: string[];
}

export interface RAGContext {
  historicalEvidence: string;
  patternsIdentified: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  sourcesUsed: number;
  tokenCount: number;
}

export interface RAGGuardrails {
  maxRetrievedChunks: number;
  maxFinalContextChunks: number;
  relevanceThreshold: number;
  maxRAGContextTokens: number;
  maxChunkTokens: number;
  minChunkQualityScore: number;
  requireOutcomeForOpportunities: boolean;
  neverOverrideLiveData: boolean;
  alwaysLabelAsHistorical: boolean;
  logAllRetrievals: boolean;
}

export interface RAGMetrics {
  totalQueries: number;
  avgRetrievalTimeMs: number;
  avgChunksRetrieved: number;
  avgRelevanceScore: number;
  hitRatio: number;
  tokensSaved: number;
}
```

---

## Fluxo de Execução

```text
1. AGENT RECEIVES REQUEST
   └── Entity ID + Type + Trigger

2. BUILD RAG QUERY
   └── Extract entity key fields
   └── Determine query type (opportunity → outcomes, lead → patterns)
   └── Set filters (workspace, recency, outcome type)

3. COARSE RETRIEVAL (Phase 1)
   └── Query rag_historical_outcomes (top-10)
   └── Query ai_agent_strategic_memory (top-5)
   └── Query rag_indexed_chunks (top-10)
   └── Apply metadata filters

4. FINE RETRIEVAL (Phase 2)
   └── Re-rank by semantic similarity to current entity
   └── Apply relevance threshold (>= 0.6)
   └── Apply token budget (max 20% of agent budget)
   └── Select top-5 final chunks

5. BUILD RAG CONTEXT
   └── Format historical outcomes as evidence
   └── Format patterns as insights
   └── Apply labeling ("HISTÓRICO", "PADRÃO")
   └── Ensure separation from live data

6. INJECT INTO PROMPT
   └── Insert after live entity data
   └── Before agent task/question
   └── Within token budget

7. RECORD METRICS
   └── Log retrieval stats
   └── Track usage for optimization
```

---

## Guardrails a Adicionar

```typescript
// Adicionar a src/lib/aiSafetyRules.ts

export const RAG_GUARDRAILS: RAGGuardrails = {
  // Retrieval limits
  maxRetrievedChunks: 20,
  maxFinalContextChunks: 5,
  relevanceThreshold: 0.6,
  
  // Token budgets
  maxRAGContextTokens: 1500,  // ~20% of typical budget
  maxChunkTokens: 500,
  
  // Quality controls
  minChunkQualityScore: 0.5,
  requireOutcomeForOpportunities: true,
  
  // Safety
  neverOverrideLiveData: true,
  alwaysLabelAsHistorical: true,
  logAllRetrievals: true,
};

export const RAG_FORBIDDEN_PATTERNS = {
  NO_FIXED_CHUNKING: 'Chunking deve ser semântico, não por tamanho fixo',
  NO_EMBED_EVERYTHING: 'Apenas conteúdo de qualidade é embedido',
  NO_BLIND_INJECTION: 'RAG context deve ter relevance >= threshold',
  NO_SINGLE_PASS: 'Retrieval deve ser hierárquico (2 fases)',
  NO_MAXIMIZE_CONTEXT: 'Priorizar relevância sobre quantidade',
  NO_OVERRIDE_LIVE: 'RAG nunca sobrepõe dados ao vivo',
  NO_UNLABELED_RAG: 'RAG context deve ser claramente rotulado',
};
```

---

## Ordem de Implementação

1. **Fase 1 - Fundações** (1h)
   - Criar tipos `src/types/ragLayer.ts`
   - Adicionar guardrails a `aiSafetyRules.ts`
   - Executar migração de base de dados

2. **Fase 2 - Indexação** (1.5h)
   - Criar `rag-chunker.ts`
   - Criar `rag-index-outcome/index.ts`
   - Implementar trigger de outcomes

3. **Fase 3 - Retrieval** (2h)
   - Criar `rag-retriever.ts`
   - Criar `rag-hybrid-search.ts`
   - Criar função SQL `match_historical_outcomes`

4. **Fase 4 - Context Building** (1h)
   - Criar `rag-context-builder.ts`
   - Criar `rag-guardrails.ts`
   - Integrar com `context-collector.ts`

5. **Fase 5 - Agent Integration** (1.5h)
   - Modificar `ai-agent-orchestrator`
   - Modificar `ai-agent-opportunity`
   - Criar `rag-search/index.ts`

6. **Fase 6 - Métricas** (30min)
   - Implementar logging de retrieval
   - Criar queries de análise

---

## Métricas de Sucesso

| Métrica | Alvo Inicial | Alvo 30 Dias |
|---------|--------------|--------------|
| Retrieval Relevance | > 0.65 avg | > 0.75 avg |
| RAG Usage Rate | 30% of analyses | 60% of analyses |
| Context Quality | 80% useful | 90% useful |
| Token Efficiency | < 25% budget | < 20% budget |
| Agent Confidence Boost | +5% | +15% |
