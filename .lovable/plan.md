
# Prompt & Response Caching Optimization Layer

## Resumo Executivo

Implementar uma camada multi-nível de caching para os agentes AI do CRM que reduz custos de LLM, melhora latência e mantém a corretude das análises através de invalidação determinística.

---

## Diagnóstico do Estado Atual

### Pontos Fortes Existentes
- **Context Control Layer** já implementado com gestão de tokens e priorização
- **ai_agent_executions** regista todas as execuções (pode servir como cache histórico)
- **ai_agent_memory** armazena conclusões e factos (potencial para CAG)
- Guardrails definidos em `aiSafetyRules.ts`

### Lacunas Identificadas
1. **Sem prompt prefix caching** - System prompts são reconstruídos em cada execução
2. **Sem response caching** - Análises idênticas são recomputadas
3. **Sem invalidação automática** - Não há tracking de mudanças de estado
4. **Sem métricas de cache** - Não há tracking de hit ratio ou cost savings
5. **Sem versionamento de prompts** - Mudanças em guardrails invalidam todo o cache

---

## Arquitetura de 3 Níveis

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      CACHE OPTIMIZATION LAYER                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │   NÍVEL 1           │  │   NÍVEL 2           │  │   NÍVEL 3       │ │
│  │   Prompt Prefix     │  │   Response Cache    │  │   CAG Layer     │ │
│  │   (In-Memory)       │  │   (Database)        │  │   (Pre-inject)  │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ │
│           │                        │                       │            │
│           ▼                        ▼                       ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │ • System prompts    │  │ • Full LLM outputs  │  │ • Business rules│ │
│  │ • Guardrails        │  │ • By entity state   │  │ • Scoring logic │ │
│  │ • Output contracts  │  │ • TTL managed       │  │ • Industry data │ │
│  │ • Versioned         │  │ • Invalidation      │  │ • Static refs   │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    INVALIDATION ENGINE                              │ │
│  │  • Entity change detection  • Memory updates  • Rule version change │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    METRICS & OBSERVABILITY                          │ │
│  │  • Hit ratio  • Cost savings  • Latency improvement  • Per-agent    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Nível 1: Prompt Prefix Caching

### Objetivo
Cachear secções estáveis de prompts partilhadas entre execuções.

### Componentes Cacheáveis

| Componente | Estabilidade | Versão |
|------------|--------------|--------|
| Agent role instructions | Alta | v1.0 |
| Output contracts (JSON schema) | Alta | v1.0 |
| Guardrails & constraints | Alta | v1.0 |
| System-level instructions | Alta | v1.0 |

### Regras
- Prefixos devem ser idênticos para maximizar cache hits
- Versionados com hash do conteúdo
- Armazenados em memória da edge function
- TTL: Session duration (até cold start)

### Ficheiro a Criar
`supabase/functions/_shared/prompt-cache.ts`

```text
Responsabilidades:
- Gerar hash de prompt prefix
- Armazenar prefixes em Map()
- Validar versão antes de usar
- Métricas de hit/miss
```

---

## Nível 2: Response Caching

### Objetivo
Cachear respostas completas para estados de entidade idênticos.

### Cache Key Composition

```text
CACHE_KEY = hash(
  agent_type          // 'lead' | 'opportunity' | etc.
  entity_id           // UUID
  entity_state_hash   // hash(entity data fields)
  memory_version      // max(updated_at) from memories
  context_hash        // hash(included context items)
  prompt_version      // version of prompt template
)
```

### Regras de Elegibilidade

**Cacheable:**
- Temperature = 0 (determinístico)
- Confidence level = 'high' ou 'medium'
- Prompt structure determinístico
- Context selection determinístico

**Não Cacheable:**
- Confidence level = 'low'
- Trigger type = 'manual' (user expects fresh analysis)
- Entity state changed
- Memory updated since last cache

### Tabela de Cache (Nova)

```sql
CREATE TABLE ai_agent_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  agent_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  cache_key TEXT NOT NULL UNIQUE,
  entity_state_hash TEXT NOT NULL,
  memory_version TIMESTAMP WITH TIME ZONE,
  prompt_version TEXT NOT NULL,
  
  -- Cached response
  response JSONB NOT NULL,
  executive_summary TEXT,
  confidence_level TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  hit_count INTEGER DEFAULT 0,
  
  -- Cost tracking
  tokens_saved INTEGER DEFAULT 0,
  estimated_cost_saved DECIMAL(10,4) DEFAULT 0,
  
  -- Invalidation
  invalidated_at TIMESTAMP WITH TIME ZONE,
  invalidation_reason TEXT
);

CREATE INDEX idx_cache_lookup ON ai_agent_response_cache(cache_key) WHERE invalidated_at IS NULL;
CREATE INDEX idx_cache_entity ON ai_agent_response_cache(entity_id, agent_type);
CREATE INDEX idx_cache_expiry ON ai_agent_response_cache(expires_at);
```

### TTL por Tipo de Entidade

| Entity Type | TTL | Razão |
|-------------|-----|-------|
| Lead | 4 horas | Mudanças frequentes |
| Opportunity | 2 horas | Alta volatilidade |
| Contact | 12 horas | Mais estável |
| Client | 24 horas | Mais estável |

---

## Nível 3: Cache-Augmented Generation (CAG)

### Objetivo
Pré-injetar dados de referência estáveis diretamente no prompt cacheado.

### Dados Elegíveis para CAG

| Tipo | Exemplo | Versão |
|------|---------|--------|
| Business rules | Critérios de qualificação | v1.0 |
| Scoring heuristics | Fórmulas de lead score | v1.0 |
| Industry templates | Templates por setor | v1.0 |
| Static references | Nomes de etapas do pipeline | Dinâmico |

### Regras CAG
- Dados devem ser estáveis e versionados
- Separação explícita de dados ao vivo
- Refresh quando versão muda
- Nunca incluir dados específicos de entidade

### Ficheiro a Criar
`supabase/functions/_shared/cag-data.ts`

---

## Invalidação Automática (Crítico)

### Triggers de Invalidação

| Evento | Ação |
|--------|------|
| Entity data update | Invalidar cache desta entidade |
| Pipeline stage change | Invalidar cache desta entidade |
| New activity logged | Invalidar cache desta entidade |
| Memory created/updated | Invalidar cache desta entidade |
| Memory consolidated | Invalidar cache desta entidade |
| Prompt version change | Invalidar ALL caches deste agent type |
| Business rules update | Invalidar ALL caches |

### Implementação via Database Triggers

```sql
-- Trigger para invalidar cache quando entidade muda
CREATE OR REPLACE FUNCTION invalidate_entity_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agent_response_cache
  SET 
    invalidated_at = now(),
    invalidation_reason = TG_TABLE_NAME || ' updated'
  WHERE 
    entity_id = NEW.id 
    AND invalidated_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a leads, opportunities, contacts, companies
CREATE TRIGGER invalidate_lead_cache
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_entity_cache();
```

---

## Métricas & Observabilidade

### Tabela de Métricas (Nova)

```sql
CREATE TABLE ai_cache_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  agent_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Counters
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  invalidations INTEGER DEFAULT 0,
  
  -- Cost savings
  tokens_saved INTEGER DEFAULT 0,
  estimated_cost_saved DECIMAL(10,4) DEFAULT 0,
  
  -- Latency
  avg_cache_hit_latency_ms INTEGER,
  avg_cache_miss_latency_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_metrics_workspace ON ai_cache_metrics(workspace_id, period_start);
```

### KPIs a Monitorizar

| Métrica | Alvo | Descrição |
|---------|------|-----------|
| Cache Hit Ratio | > 40% | % de requests servidos do cache |
| Cost Savings | Track | Tokens não consumidos |
| Latency Improvement | > 80% | Tempo cache vs fresh |
| Staleness Rate | < 5% | Cache usado com dados desatualizados |
| Invalidation Rate | Monitor | Frequência de invalidações |

---

## Ficheiros a Criar/Modificar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `supabase/functions/_shared/cache-manager.ts` | **NOVO** | Core caching logic |
| `supabase/functions/_shared/cache-key-builder.ts` | **NOVO** | Deterministic key generation |
| `supabase/functions/_shared/cache-invalidation.ts` | **NOVO** | Invalidation triggers |
| `supabase/functions/_shared/prompt-cache.ts` | **NOVO** | Prompt prefix caching |
| `supabase/functions/_shared/cag-data.ts` | **NOVO** | CAG reference data |
| `src/types/cacheLayer.ts` | **NOVO** | TypeScript types |
| `src/lib/aiSafetyRules.ts` | MODIFICAR | Add cache guardrails |
| `supabase/functions/ai-agent-orchestrator/index.ts` | MODIFICAR | Integrate cache layer |
| `supabase/functions/ai-agent-opportunity/index.ts` | MODIFICAR | Integrate cache layer |
| `supabase/functions/ai-agent-client/index.ts` | MODIFICAR | Integrate cache layer |

---

## Fluxo de Execução com Cache

```text
1. REQUEST RECEIVED
   └── Agent recebe entityId + agentType

2. BUILD CACHE KEY
   └── Fetch entity current state
   └── Get memory version (max updated_at)
   └── Get prompt version
   └── Generate deterministic hash

3. CHECK CACHE
   └── Query ai_agent_response_cache by cache_key
   └── Validate: not expired, not invalidated
   └── If HIT:
       ├── Update hit_count and last_used_at
       ├── Log cache hit metric
       └── Return cached response (FAST PATH)

4. CACHE MISS → EXECUTE ANALYSIS
   └── Build context using Context Control Layer
   └── Call LLM (existing flow)
   └── Get response

5. CACHE RESPONSE (if eligible)
   └── Check eligibility:
       ├── Confidence level >= 'medium'
       ├── Temperature = 0
       └── Deterministic context
   └── Insert into ai_agent_response_cache
   └── Log cache miss metric

6. RETURN RESPONSE
   └── Include cache metadata in response
```

---

## Garantias de Segurança

### Invariantes

| Garantia | Implementação |
|----------|---------------|
| Cache never overrides live data | Live data fetched fresh, only LLM response cached |
| Cached outputs traceable | source_execution_id stored |
| Staleness detectable | entity_state_hash compared before use |
| Auditable | Full logging in ai_cache_metrics |
| Explainable | cache_hit flag in response metadata |

### Anti-Patterns Prevenidos

| Anti-Pattern | Prevenção |
|--------------|-----------|
| Cache everything | Eligibility rules enforced |
| Cache high-temperature | Temperature check before caching |
| No invalidation | Trigger-based automatic invalidation |
| Silent cache usage | response.metadata.fromCache = true |
| Entity-state unawareness | entity_state_hash in cache key |

---

## Tipos TypeScript

```typescript
// src/types/cacheLayer.ts

interface CacheKey {
  agentType: AgentType;
  entityId: string;
  entityStateHash: string;
  memoryVersion: string;
  contextHash: string;
  promptVersion: string;
  compositeKey: string; // Final hash
}

interface CacheEntry {
  id: string;
  cacheKey: string;
  response: AgentOutput;
  executiveSummary: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  expiresAt: string;
  hitCount: number;
  tokensSaved: number;
}

interface CacheCheckResult {
  hit: boolean;
  entry?: CacheEntry;
  reason?: string; // 'expired' | 'invalidated' | 'not_found' | 'stale_state'
}

interface CacheEligibility {
  eligible: boolean;
  reason?: string;
  suggestedTTL?: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  tokensSaved: number;
  estimatedCostSaved: number;
  avgHitLatencyMs: number;
  avgMissLatencyMs: number;
}

interface CacheConfig {
  enabled: boolean;
  ttlByEntityType: Record<string, number>;
  maxEntriesPerEntity: number;
  autoInvalidation: boolean;
  trackMetrics: boolean;
}
```

---

## Regras de Segurança (Adições)

```typescript
// Adicionar a src/lib/aiSafetyRules.ts

export const CACHE_GUARDRAILS = {
  // Cache eligibility
  minConfidenceForCache: 'medium' as const,
  maxTemperatureForCache: 0,
  
  // TTL limits (em horas)
  ttlByEntityType: {
    lead: 4,
    opportunity: 2,
    contact: 12,
    client: 24,
  },
  
  // Invalidation
  autoInvalidateOnEntityChange: true,
  autoInvalidateOnMemoryUpdate: true,
  autoInvalidateOnPromptVersionChange: true,
  
  // Limits
  maxCacheEntriesPerEntity: 5,
  maxCacheAgeHours: 48,
  
  // Safety
  alwaysFetchLiveEntityData: true,
  neverCacheManualTriggers: true,
  logAllCacheHits: true,
};

export const CACHE_FORBIDDEN_PATTERNS = {
  NO_CACHE_LOW_CONFIDENCE: 'Respostas low confidence nunca são cacheadas',
  NO_CACHE_HIGH_TEMPERATURE: 'Outputs com temperature > 0 nunca são cacheados',
  NO_CACHE_WITHOUT_STATE_HASH: 'Cache sem entity state hash é proibido',
  NO_SILENT_CACHE: 'Uso de cache deve ser indicado na resposta',
  NO_STALE_CACHE: 'Cache com estado desatualizado deve ser invalidado',
};
```

---

## Migração de Base de Dados

```sql
-- Tabela principal de cache
CREATE TABLE ai_agent_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  entity_state_hash TEXT NOT NULL,
  memory_version TIMESTAMP WITH TIME ZONE,
  prompt_version TEXT NOT NULL DEFAULT 'v1.0',
  context_hash TEXT,
  
  -- Cached response
  response JSONB NOT NULL,
  executive_summary TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  hit_count INTEGER DEFAULT 0,
  original_duration_ms INTEGER,
  tokens_saved INTEGER DEFAULT 0,
  
  -- Invalidation
  invalidated_at TIMESTAMP WITH TIME ZONE,
  invalidation_reason TEXT,
  
  CONSTRAINT unique_cache_key UNIQUE (cache_key)
);

-- Índices
CREATE INDEX idx_cache_lookup ON ai_agent_response_cache(cache_key) 
  WHERE invalidated_at IS NULL AND expires_at > now();
CREATE INDEX idx_cache_entity ON ai_agent_response_cache(entity_id, agent_type);
CREATE INDEX idx_cache_workspace ON ai_agent_response_cache(workspace_id);
CREATE INDEX idx_cache_expiry ON ai_agent_response_cache(expires_at) 
  WHERE invalidated_at IS NULL;

-- Tabela de métricas
CREATE TABLE ai_cache_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  invalidations INTEGER DEFAULT 0,
  tokens_saved INTEGER DEFAULT 0,
  avg_hit_latency_ms INTEGER,
  avg_miss_latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_metrics_lookup ON ai_cache_metrics(workspace_id, agent_type, period_start);

-- RLS Policies
ALTER TABLE ai_agent_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache access by workspace members" ON ai_agent_response_cache
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Metrics access by workspace members" ON ai_cache_metrics
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Função de invalidação
CREATE OR REPLACE FUNCTION invalidate_entity_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agent_response_cache
  SET 
    invalidated_at = now(),
    invalidation_reason = TG_TABLE_NAME || ' updated'
  WHERE 
    entity_id = NEW.id 
    AND invalidated_at IS NULL;
  
  -- Increment invalidation counter
  INSERT INTO ai_cache_metrics (
    workspace_id, agent_type, period_start, period_end, invalidations
  )
  SELECT 
    workspace_id, agent_type, date_trunc('hour', now()), date_trunc('hour', now()) + interval '1 hour', 1
  FROM ai_agent_response_cache
  WHERE entity_id = NEW.id
  GROUP BY workspace_id, agent_type
  ON CONFLICT (workspace_id, agent_type, period_start) 
  DO UPDATE SET invalidations = ai_cache_metrics.invalidations + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de invalidação
CREATE TRIGGER invalidate_lead_cache
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

CREATE TRIGGER invalidate_opportunity_cache
  AFTER UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

CREATE TRIGGER invalidate_contact_cache
  AFTER UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

CREATE TRIGGER invalidate_company_cache
  AFTER UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION invalidate_entity_cache();

-- Trigger para memórias
CREATE OR REPLACE FUNCTION invalidate_memory_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_agent_response_cache
  SET 
    invalidated_at = now(),
    invalidation_reason = 'memory updated'
  WHERE 
    entity_id = NEW.entity_id 
    AND invalidated_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER invalidate_cache_on_memory
  AFTER INSERT OR UPDATE ON ai_agent_memory
  FOR EACH ROW EXECUTE FUNCTION invalidate_memory_cache();

-- Função de cleanup (para cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_agent_response_cache
  WHERE expires_at < now() OR invalidated_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Ordem de Implementação

1. **Fase 1 - Fundações** (1h)
   - Criar `src/types/cacheLayer.ts`
   - Adicionar constantes a `aiSafetyRules.ts`
   - Executar migração de base de dados

2. **Fase 2 - Core Cache** (2h)
   - Criar `cache-key-builder.ts`
   - Criar `cache-manager.ts`
   - Criar `cache-invalidation.ts`

3. **Fase 3 - Prompt & CAG** (1h)
   - Criar `prompt-cache.ts`
   - Criar `cag-data.ts`

4. **Fase 4 - Agent Integration** (1.5h)
   - Modificar `ai-agent-orchestrator`
   - Modificar `ai-agent-opportunity`
   - Modificar `ai-agent-client`

5. **Fase 5 - Observability** (30min)
   - Adicionar logging de métricas
   - Criar queries de análise

---

## Métricas de Sucesso

| Métrica | Alvo Inicial | Alvo 30 Dias |
|---------|--------------|--------------|
| Cache Hit Ratio | 20% | 45% |
| Latency Reduction | 50% | 80% |
| Token Savings | 15% | 35% |
| Staleness Rate | < 10% | < 3% |
| Invalidation Accuracy | 95% | 99% |
