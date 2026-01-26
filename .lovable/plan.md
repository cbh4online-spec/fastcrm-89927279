
# Contextual & Entity-Based Memory System

## Análise do Sistema Actual

### O Que Já Existe
| Componente | Estado | Limitações |
|------------|--------|------------|
| `ai_agent_memory` table | ✅ Implementada | Apenas 3 tipos de memória básicos |
| `cleanup_expired_agent_memory()` | ✅ Implementada | Só limpa por data, não por relevância |
| Guardrails de memória | ✅ `agentSafetyRules.ts` | Limites definidos mas não enforced server-side |
| Semantic search (pgvector) | ✅ Disponível | Só usado na Knowledge Base, não em memória de agentes |
| Recuperação de memória | ⚠️ Básica | Sem priorização, sem scoring de relevância |

### Lacunas Identificadas
1. **Sem tiered memory** - Não distingue short-term vs entity vs strategic
2. **Sem semantic retrieval** - Busca apenas por recency, não por relevância semântica
3. **Sem consolidação** - Memórias duplicadas ou relacionadas não são mescladas
4. **Sem versionamento** - Factos sobrescritos perdem histórico
5. **Sem categorização rica** - Apenas 3 tipos limitados de memória
6. **Sem cleanup inteligente** - Não remove memórias de baixa relevância
7. **Sem memory-aware prompting** - Memória injectada sem separação clara

---

## Arquitectura Proposta: Tiered Memory System

### Diagrama Conceptual

```text
+-------------------------------------------------------------+
|                 SHORT-TERM MEMORY (Execution)               |
|  - Exists only during agent execution                       |
|  - Reasoning steps, intermediate conclusions                |
|  - Discarded after completion                               |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 ENTITY MEMORY (Primary Store)               |
|  - Facts about specific CRM entities                        |
|  - Structured, updatable, versioned                         |
|  - Types: fact, preference, signal, pattern, objection      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|              STRATEGIC MEMORY (Long-Term Insights)          |
|  - Cross-entity patterns                                    |
|  - Workspace-level learnings                                |
|  - Consolidated from entity memory                          |
+-------------------------------------------------------------+
```

---

## Componentes a Implementar

### 1. Schema Enhancements

#### Expandir `ai_agent_memory` com campos adicionais:

```sql
-- New columns for enhanced memory system
ALTER TABLE ai_agent_memory 
  ADD COLUMN IF NOT EXISTS memory_category TEXT DEFAULT 'fact',
  ADD COLUMN IF NOT EXISTS source_execution_id UUID REFERENCES ai_agent_executions(id),
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'agent_conclusion',
  ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES ai_agent_memory(id),
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- New check constraint for memory categories
ALTER TABLE ai_agent_memory 
  DROP CONSTRAINT IF EXISTS ai_agent_memory_memory_type_check,
  ADD CONSTRAINT ai_agent_memory_memory_type_check 
    CHECK (memory_type IN ('conclusion', 'user_feedback', 'important_signal', 'fact', 'preference', 'pattern', 'objection', 'risk'));

-- Index for semantic search on memory
CREATE INDEX IF NOT EXISTS ai_agent_memory_embedding_idx 
  ON ai_agent_memory USING hnsw (embedding vector_cosine_ops);
```

#### Nova tabela: `ai_agent_strategic_memory`

```sql
CREATE TABLE ai_agent_strategic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type TEXT NOT NULL, -- 'objection', 'conversion', 'churn', 'success', 'failure'
  pattern_description TEXT NOT NULL,
  
  -- Context
  entity_types TEXT[] NOT NULL, -- Which entities this applies to
  conditions JSONB DEFAULT '{}', -- When this pattern applies
  
  -- Statistics
  occurrence_count INTEGER DEFAULT 1,
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  last_occurrence_at TIMESTAMPTZ DEFAULT now(),
  
  -- Derived insights
  recommended_actions TEXT[],
  contraindicated_actions TEXT[],
  
  -- Embedding for semantic search
  embedding vector(1536),
  
  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_strategic_memory_workspace ON ai_agent_strategic_memory(workspace_id, is_active);
CREATE INDEX idx_strategic_memory_pattern ON ai_agent_strategic_memory(pattern_type, confidence_score DESC);
```

#### Nova tabela: `ai_memory_access_log`

```sql
CREATE TABLE ai_memory_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES ai_agent_memory(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES ai_agent_executions(id),
  
  -- Access context
  access_type TEXT NOT NULL, -- 'retrieved', 'used_in_reasoning', 'cited_in_output'
  relevance_score_at_retrieval NUMERIC(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memory_access_log_memory ON ai_memory_access_log(memory_id, created_at DESC);
```

---

### 2. Database Functions

#### `retrieve_entity_memories()` - Intelligent Memory Retrieval

```sql
CREATE OR REPLACE FUNCTION retrieve_entity_memories(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT,
  p_query_embedding vector(1536) DEFAULT NULL,
  p_max_results INTEGER DEFAULT 10,
  p_min_relevance NUMERIC DEFAULT 0.3,
  p_include_strategic BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  memory_category TEXT,
  content TEXT,
  relevance_score NUMERIC,
  semantic_score NUMERIC,
  combined_score NUMERIC,
  is_validated BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Retrieval logic:
  -- 1. Filter by workspace and entity
  -- 2. Exclude expired memories
  -- 3. Calculate combined score (relevance + recency + semantic)
  -- 4. Return top N by combined score
  
  RETURN QUERY
  SELECT 
    m.id,
    m.memory_type,
    m.memory_category,
    m.content,
    m.relevance_score,
    CASE 
      WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL 
      THEN 1 - (m.embedding <=> p_query_embedding)
      ELSE 0.5
    END as semantic_score,
    (
      COALESCE(m.relevance_score, 0.5) * 0.4 +
      CASE 
        WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL 
        THEN (1 - (m.embedding <=> p_query_embedding)) * 0.4
        ELSE 0.2
      END +
      (1.0 - EXTRACT(EPOCH FROM (now() - m.created_at)) / (90 * 24 * 60 * 60)) * 0.2
    ) as combined_score,
    m.is_validated,
    m.created_at
  FROM ai_agent_memory m
  WHERE 
    m.workspace_id = p_workspace_id
    AND m.entity_id = p_entity_id
    AND m.entity_type = p_entity_type
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND m.superseded_by IS NULL
    AND COALESCE(m.relevance_score, 0.5) >= p_min_relevance
  ORDER BY combined_score DESC
  LIMIT p_max_results;
END;
$$;
```

#### `store_entity_memory()` - Safe Memory Storage

```sql
CREATE OR REPLACE FUNCTION store_entity_memory(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT,
  p_memory_type TEXT,
  p_content TEXT,
  p_relevance_score NUMERIC DEFAULT 1.0,
  p_source_execution_id UUID DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 90,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memory_id UUID;
  v_existing_id UUID;
  v_memory_count INTEGER;
  v_max_memories INTEGER := 50;
BEGIN
  -- Check if similar memory exists (potential duplicate)
  SELECT id INTO v_existing_id
  FROM ai_agent_memory
  WHERE 
    workspace_id = p_workspace_id
    AND entity_id = p_entity_id
    AND memory_type = p_memory_type
    AND content = p_content
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
  
  -- If duplicate exists, update relevance and return
  IF v_existing_id IS NOT NULL THEN
    UPDATE ai_agent_memory
    SET 
      relevance_score = GREATEST(relevance_score, p_relevance_score),
      access_count = access_count + 1,
      last_accessed_at = now()
    WHERE id = v_existing_id;
    RETURN v_existing_id;
  END IF;
  
  -- Check memory limit per entity
  SELECT COUNT(*) INTO v_memory_count
  FROM ai_agent_memory
  WHERE 
    workspace_id = p_workspace_id
    AND entity_id = p_entity_id
    AND (expires_at IS NULL OR expires_at > now());
  
  -- If limit reached, remove lowest relevance memories
  IF v_memory_count >= v_max_memories THEN
    DELETE FROM ai_agent_memory
    WHERE id IN (
      SELECT id 
      FROM ai_agent_memory
      WHERE 
        workspace_id = p_workspace_id
        AND entity_id = p_entity_id
        AND is_validated = false
      ORDER BY relevance_score ASC, created_at ASC
      LIMIT 5
    );
  END IF;
  
  -- Insert new memory
  INSERT INTO ai_agent_memory (
    workspace_id,
    entity_id,
    entity_type,
    memory_type,
    content,
    relevance_score,
    source_execution_id,
    expires_at,
    created_by
  ) VALUES (
    p_workspace_id,
    p_entity_id,
    p_entity_type,
    p_memory_type,
    LEFT(p_content, 2000), -- Enforce max length
    LEAST(p_relevance_score, 1.0),
    p_source_execution_id,
    CASE WHEN p_expires_in_days > 0 THEN now() + (p_expires_in_days || ' days')::interval ELSE NULL END,
    p_created_by
  )
  RETURNING id INTO v_memory_id;
  
  RETURN v_memory_id;
END;
$$;
```

#### `consolidate_entity_memories()` - Memory Consolidation

```sql
CREATE OR REPLACE FUNCTION consolidate_entity_memories(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consolidated INTEGER := 0;
BEGIN
  -- Mark old, low-relevance, unaccessed memories as expired
  UPDATE ai_agent_memory
  SET expires_at = now()
  WHERE 
    workspace_id = p_workspace_id
    AND entity_id = p_entity_id
    AND entity_type = p_entity_type
    AND (
      -- Low relevance and old
      (relevance_score < 0.3 AND created_at < now() - interval '30 days')
      -- Never accessed and old
      OR (access_count = 0 AND created_at < now() - interval '60 days')
      -- Very old regardless
      OR created_at < now() - interval '180 days'
    )
    AND is_validated = false
    AND expires_at IS NULL;
  
  GET DIAGNOSTICS v_consolidated = ROW_COUNT;
  
  RETURN v_consolidated;
END;
$$;
```

---

### 3. Edge Function: `ai-memory-manager`

**Responsabilidades:**
- API centralizada para gestão de memória
- Embedding generation para memórias
- Consolidação periódica
- Retrieval com scoring inteligente

**Endpoints:**
```text
POST /store         - Armazenar nova memória
POST /retrieve      - Buscar memórias relevantes (com semantic search)
POST /update        - Actualizar memória existente
POST /validate      - Marcar memória como validada
POST /consolidate   - Trigger consolidação
POST /embed         - Gerar embedding para memória
GET  /stats         - Estatísticas de memória por entidade
```

---

### 4. Edge Function: `ai-memory-embedder`

**Responsabilidades:**
- Processar queue de memórias sem embedding
- Gerar embeddings via Lovable AI gateway
- Actualizar memórias com embeddings

**Lógica:**
```text
1. Buscar memórias sem embedding (batch de 10)
2. Para cada memória:
   a. Gerar embedding via text-embedding-ada-002
   b. Actualizar coluna embedding
3. Marcar como processado
4. Repetir até queue vazia ou limite
```

---

### 5. TypeScript Types

#### `src/types/agentMemory.ts`

```typescript
// Memory tiers
export type MemoryTier = 'short_term' | 'entity' | 'strategic';

// Enhanced memory types
export type MemoryType = 
  | 'conclusion'      // Agent final conclusion
  | 'user_feedback'   // User validation/correction
  | 'important_signal'// Key signal detected
  | 'fact'            // Verified fact about entity
  | 'preference'      // Known preference
  | 'pattern'         // Behavioral pattern
  | 'objection'       // Recorded objection
  | 'risk';           // Identified risk

// Memory categories
export type MemoryCategory = 
  | 'contact_preference'  // How they prefer to be contacted
  | 'decision_criteria'   // What influences their decisions
  | 'relationship'        // Relationship dynamics
  | 'timeline'            // Time-related patterns
  | 'price_sensitivity'   // Price/value concerns
  | 'competitive'         // Competitor mentions
  | 'product_interest'    // Product/service interests
  | 'general';            // Other

// Memory source
export type MemorySource = 
  | 'agent_conclusion'
  | 'user_input'
  | 'conversation_analysis'
  | 'pattern_detection'
  | 'consolidation';

// Enhanced memory interface
export interface EntityMemory {
  id: string;
  workspaceId: string;
  entityId: string;
  entityType: string;
  
  // Content
  memoryType: MemoryType;
  memoryCategory: MemoryCategory;
  content: string;
  
  // Scoring
  relevanceScore: number;      // 0-1, decays over time
  semanticScore?: number;      // 0-1, similarity to query
  combinedScore?: number;      // Weighted combination
  
  // Provenance
  sourceType: MemorySource;
  sourceExecutionId?: string;
  
  // Validation
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: string;
  
  // Versioning
  version: number;
  supersededBy?: string;
  
  // Usage tracking
  accessCount: number;
  lastAccessedAt?: string;
  
  // Lifecycle
  expiresAt?: string;
  createdAt: string;
  createdBy?: string;
}

// Strategic memory
export interface StrategicMemory {
  id: string;
  workspaceId: string;
  
  patternType: 'objection' | 'conversion' | 'churn' | 'success' | 'failure';
  patternDescription: string;
  
  entityTypes: string[];
  conditions: Record<string, unknown>;
  
  occurrenceCount: number;
  confidenceScore: number;
  lastOccurrenceAt: string;
  
  recommendedActions: string[];
  contraindicatedActions: string[];
  
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

// Memory retrieval request
export interface MemoryRetrievalRequest {
  entityId: string;
  entityType: string;
  
  // Filtering
  memoryTypes?: MemoryType[];
  minRelevance?: number;
  includeExpired?: boolean;
  
  // Semantic search
  queryText?: string;           // Will be embedded for semantic search
  queryEmbedding?: number[];    // Pre-computed embedding
  
  // Limits
  maxResults?: number;
  
  // Options
  includeStrategic?: boolean;   // Include workspace-level patterns
  onlyValidated?: boolean;      // Only validated memories
}

// Memory retrieval response
export interface MemoryRetrievalResponse {
  memories: EntityMemory[];
  strategicMemories?: StrategicMemory[];
  
  // Metadata
  totalAvailable: number;
  retrievedCount: number;
  queryUsedSemantic: boolean;
}

// Memory-aware prompt context
export interface MemoryPromptContext {
  // Labeled sections for prompt injection
  knownFacts: string[];         // Verified facts about entity
  preferences: string[];        // Known preferences
  historicalPatterns: string[]; // Observed patterns
  recentSignals: string[];      // Recent important signals
  risks: string[];              // Known risks
  
  // Confidence
  overallConfidence: 'high' | 'medium' | 'low';
  staleDataWarning?: string;
}
```

---

### 6. Hooks

#### `src/hooks/useAgentMemory.ts`

```typescript
export function useAgentMemory(entityId: string, entityType: string) {
  return {
    // Retrieval
    memories: EntityMemory[],
    isLoading: boolean,
    
    // Actions
    storeMemory: (type, content, relevance?) => Promise<string>,
    validateMemory: (memoryId, isValid) => Promise<void>,
    deleteMemory: (memoryId) => Promise<void>,
    
    // Stats
    memoryCount: number,
    validatedCount: number,
    averageRelevance: number,
  };
}
```

#### `src/hooks/useMemoryRetrieval.ts`

```typescript
export function useMemoryRetrieval(entityId: string, entityType: string) {
  return {
    // Semantic retrieval
    retrieve: (query: string, options?) => Promise<MemoryRetrievalResponse>,
    
    // Build prompt context
    getPromptContext: () => Promise<MemoryPromptContext>,
  };
}
```

---

### 7. UI Components

#### `src/components/ai-agents/EntityMemoryPanel.tsx`
- Lista memórias de uma entidade
- Permite validar/invalidar memórias
- Mostra score de relevância
- Permite adicionar memória manual

#### `src/components/ai-agents/MemoryInsightCard.tsx`
- Mostra memória individual
- Badge de tipo e categoria
- Indicador de validação
- Histórico de versões

---

## Regras de Retrieval (CRITICAL)

### Antes de Cada Execução de Agente:

```text
1. IDENTIFY: Determinar entityId e entityType
2. FILTER: 
   - Apenas memórias do workspace correcto
   - Apenas memórias não expiradas
   - Apenas memórias não superseded
3. SCORE: Calcular combined_score para cada memória:
   - 40% relevance_score (definido na criação)
   - 40% semantic_score (se query disponível)
   - 20% recency_score (decay exponencial)
4. RANK: Ordenar por combined_score DESC
5. LIMIT: Máximo 10 memórias por execução
6. INJECT: Formatar para prompt com labels claros
```

### Memory-Aware Prompting Template:

```text
## Contexto Histórico (Memória do Sistema)

### Factos Verificados:
{{#each knownFacts}}
- {{this}}
{{/each}}

### Preferências Conhecidas:
{{#each preferences}}
- {{this}}
{{/each}}

### Padrões Observados:
{{#each historicalPatterns}}
- {{this}}
{{/each}}

### Sinais Recentes:
{{#each recentSignals}}
- {{this}}
{{/each}}

### Riscos Identificados:
{{#each risks}}
- {{this}}
{{/each}}

NOTA: A informação acima é contexto histórico. Dados actuais do CRM têm precedência.
Confiança geral neste contexto: {{overallConfidence}}
{{#if staleDataWarning}}
⚠️ {{staleDataWarning}}
{{/if}}

---

## Dados Actuais do CRM
[... dados da entidade ...]
```

---

## Segurança e Isolamento (NON-NEGOTIABLE)

### RLS Policies
- Todas as tabelas de memória têm RLS activado
- Isolamento por workspace enforced via RLS
- Nenhuma memória cruza workspaces

### Validações Server-Side
- Limite de 50 memórias por entidade
- Limite de 2000 caracteres por memória
- Expiração automática após 90 dias
- Cleanup de memórias de baixa relevância

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/migrations/xxx_memory_system_enhancements.sql` | Schema changes |
| `supabase/functions/ai-memory-manager/index.ts` | API de gestão de memória |
| `supabase/functions/ai-memory-embedder/index.ts` | Geração de embeddings |
| `src/types/agentMemory.ts` | Tipos TypeScript |
| `src/hooks/useAgentMemory.ts` | Hook de memória |
| `src/hooks/useMemoryRetrieval.ts` | Hook de retrieval |
| `src/components/ai-agents/EntityMemoryPanel.tsx` | Painel de memória |
| `src/components/ai-agents/MemoryInsightCard.tsx` | Card de memória |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ai-agent-orchestrator/index.ts` | Usar retrieve_entity_memories() |
| `supabase/functions/ai-agent-opportunity/index.ts` | Usar store_entity_memory() |
| `supabase/functions/ai-agent-client/index.ts` | Usar store_entity_memory() |
| `src/types/aiAgents.ts` | Importar tipos de memória |
| `src/lib/agentSafetyRules.ts` | Adicionar validações de memória server-side |

---

## Ordem de Implementação

### Passo 1: Database Schema
1. Expandir `ai_agent_memory` com novos campos
2. Criar `ai_agent_strategic_memory`
3. Criar `ai_memory_access_log`
4. Criar funções SQL

### Passo 2: Edge Functions
1. Criar `ai-memory-manager`
2. Criar `ai-memory-embedder`
3. Actualizar orchestrator para usar novas funções

### Passo 3: TypeScript & Hooks
1. Criar `src/types/agentMemory.ts`
2. Criar `useAgentMemory`
3. Criar `useMemoryRetrieval`

### Passo 4: UI Components
1. Criar `EntityMemoryPanel`
2. Criar `MemoryInsightCard`
3. Integrar nas páginas de entidade

### Passo 5: Agent Integration
1. Actualizar agentes para usar memória semântica
2. Implementar memory-aware prompting
3. Testar consolidação

---

## Métricas de Sucesso

| Métrica | Target |
|---------|--------|
| Memórias úteis recuperadas | > 80% |
| Tempo de retrieval | < 100ms |
| False positives (memória irrelevante) | < 10% |
| Memory churn (criação/remoção) | Estável |
| User validation rate | > 50% |
