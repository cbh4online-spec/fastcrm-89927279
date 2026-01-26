
# Context Window Optimization & Control Layer

## Resumo Executivo

Implementar uma camada centralizada e determinística de gestão de contexto para todos os agentes AI do CRM, garantindo que cada agente opera com o contexto certo, no momento certo, sem exceder limites de tokens e sem perda de informação crítica.

---

## Diagnóstico do Estado Atual

### Pontos Fortes
- Já existe um sistema de memória semântica (`ai_agent_memory`)
- `buildPromptContext()` no `ai-memory-manager` categoriza memórias
- Safety rules definem limites de memória (2000 chars, 50 entries)
- Agentes especializados para cada tipo de entidade

### Problemas Identificados
1. **Sem estimativa de tokens** - Nenhum agente calcula tokens antes da execução
2. **Contexto não priorizado** - Todas as fontes têm peso igual
3. **Sem compressão adaptativa** - Não há sumarização baseada em tamanho
4. **Injection desorganizado** - Contexto misturado nos prompts atuais
5. **Sem fallback graceful** - Não há degradação controlada

---

## Arquitetura da Solução

### Diagrama de Fluxo

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     CONTEXT CONTROL LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  TOKEN       │───▶│  CONTEXT     │───▶│  PRIORITY    │         │
│  │  ESTIMATOR   │    │  COLLECTOR   │    │  SORTER      │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│         │                   │                   │                  │
│         ▼                   ▼                   ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│  │  BUDGET      │    │  SUMMARIZER  │    │  PROMPT      │         │
│  │  ENFORCER    │◀──▶│  (Adaptive)  │───▶│  ASSEMBLER   │         │
│  └──────────────┘    └──────────────┘    └──────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   STRUCTURED     │
                    │   PROMPT OUTPUT  │
                    └──────────────────┘
```

---

## Componentes a Implementar

### 1. Token Estimator & Budget Manager

**Ficheiro:** `supabase/functions/_shared/context-manager.ts`

```text
Responsabilidades:
- Estimar tokens de qualquer texto (regra: ~4 chars = 1 token)
- Definir orçamentos por tipo de agente
- Calcular espaço restante em tempo real
- Retornar métricas de uso

Orçamentos de Token:
- Lead Agent: 8.000 tokens (modelo flash)
- Opportunity Agent: 12.000 tokens (análise profunda)
- Client Agent: 10.000 tokens
- Contact Agent: 6.000 tokens

Reservas Obrigatórias:
- System Prompt: 2.000 tokens
- Response Buffer: 3.000 tokens
- Contexto Disponível: Budget - Reservas
```

### 2. Context Collector & Prioritizer

**Ficheiro:** `supabase/functions/_shared/context-collector.ts`

```text
Fontes de Contexto (por ordem de prioridade):

TIER 1 - NUNCA COMPRIMIDOS (Prioridade Máxima)
├── Live Entity State (dados CRM atuais)
├── Risk Indicators ativos
└── Constraints/Guardrails do sistema

TIER 2 - COMPRESSÍVEIS (Prioridade Alta)
├── Memórias validadas (is_validated = true)
├── Factos com alta relevância (> 0.7)
└── Conclusões recentes (< 30 dias)

TIER 3 - SUMARIZÁVEIS (Prioridade Média)
├── Padrões e preferências
├── Histórico de interações (condensado)
└── Sinais importantes

TIER 4 - DESCARTÁVEIS (Prioridade Baixa)
├── Memórias antigas (> 60 dias)
├── Baixa relevância (< 0.4)
└── Dados redundantes
```

### 3. Adaptive Summarizer

**Ficheiro:** `supabase/functions/_shared/context-summarizer.ts`

```text
Estratégias por Tamanho de Contexto:

SMALL (< 4K tokens disponíveis):
- Usar dados completos
- Sem sumarização

MEDIUM (4K-8K tokens):
- Sumarizar TIER 3 e 4
- Manter TIER 1 e 2 verbatim

LARGE (> 8K tokens):
- Substituir histórico por sumários estruturados
- Droppar sinais low-confidence
- Manter apenas decisões críticas

Regras de Sumarização:
❌ NUNCA sumarizar campos CRM ao vivo
❌ NUNCA sumarizar factos validados
✅ Sumarizar por importância, não por tempo
✅ Formato estruturado (bullet points)
✅ Estável entre execuções
```

### 4. Prompt Assembler

**Ficheiro:** `supabase/functions/_shared/prompt-assembler.ts`

```text
Formato de Injeção de Contexto:

═══════════════════════════════════════════════════════
[CONSTRAINTS & GUARDRAILS]                    ← INÍCIO
Regras obrigatórias do agente
═══════════════════════════════════════════════════════

[CURRENT ENTITY DATA]
Dados CRM ao vivo (TIER 1)

[KNOWN FACTS & VALIDATED MEMORY]
Memórias confirmadas (TIER 2)

[HISTORICAL PATTERNS]
Sumários e padrões (TIER 3)

[CONTEXT METADATA]
- Token usage: X/Y
- Data freshness: last updated Z
- Confidence: high/medium/low

═══════════════════════════════════════════════════════
[AGENT TASK & OBJECTIVE]                      ← FIM
O que o agente deve fazer
═══════════════════════════════════════════════════════

Anti-Pattern: Lost-in-the-Middle
- Constraints e objetivos nos extremos
- Dados operacionais no meio
```

---

## Ficheiros a Criar/Modificar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `supabase/functions/_shared/context-manager.ts` | **NOVO** | Token estimation & budget enforcement |
| `supabase/functions/_shared/context-collector.ts` | **NOVO** | Data collection & priority sorting |
| `supabase/functions/_shared/context-summarizer.ts` | **NOVO** | Adaptive compression logic |
| `supabase/functions/_shared/prompt-assembler.ts` | **NOVO** | Structured prompt building |
| `supabase/functions/ai-agent-orchestrator/index.ts` | MODIFICAR | Integrar Context Control Layer |
| `supabase/functions/ai-agent-opportunity/index.ts` | MODIFICAR | Usar nova camada de contexto |
| `supabase/functions/ai-agent-client/index.ts` | MODIFICAR | Usar nova camada de contexto |
| `src/lib/agentSafetyRules.ts` | MODIFICAR | Adicionar regras de contexto |
| `src/types/aiAgents.ts` | MODIFICAR | Adicionar tipos de contexto |

---

## Fluxo de Execução

```text
1. REQUISIÇÃO DE ANÁLISE
   └── Agent recebe entityId + agentType + trigger

2. ESTIMATIVA INICIAL
   └── ContextManager calcula budget disponível
   └── Determina estratégia: SMALL / MEDIUM / LARGE

3. COLETA DE CONTEXTO
   └── ContextCollector busca dados por TIER
   └── Ordena por prioridade e relevância
   └── Marca dados para compressão se necessário

4. COMPRESSÃO ADAPTATIVA (se necessário)
   └── Summarizer aplica estratégia por TIER
   └── Mantém TIER 1 intacto
   └── Sumariza TIER 3/4

5. VALIDAÇÃO DE BUDGET
   └── BudgetEnforcer verifica tokens finais
   └── Se exceder: remove TIER 4 → TIER 3 → aborta
   └── Regista warnings se dados foram removidos

6. MONTAGEM DO PROMPT
   └── PromptAssembler estrutura output
   └── Constraints no início, task no fim
   └── Metadata de contexto incluído

7. EXECUÇÃO DO AGENTE
   └── Prompt estruturado enviado ao LLM
   └── Resposta processada

8. LOGGING & MÉTRICAS
   └── Tokens usados registados
   └── Warnings de contexto guardados
   └── Dados descartados documentados
```

---

## Tipos TypeScript

```typescript
// src/types/contextManager.ts

interface TokenBudget {
  total: number;
  systemPrompt: number;
  responseBuffer: number;
  available: number;
  used: number;
  remaining: number;
}

interface ContextTier {
  tier: 1 | 2 | 3 | 4;
  priority: 'critical' | 'high' | 'medium' | 'low';
  compressible: boolean;
  discardable: boolean;
}

interface ContextItem {
  source: string;
  tier: ContextTier;
  content: string;
  tokenCount: number;
  relevanceScore: number;
  timestamp: string;
  isLiveData: boolean;
}

interface ContextStrategy {
  type: 'SMALL' | 'MEDIUM' | 'LARGE';
  summarizeTiers: number[];
  discardTiers: number[];
  maxContextTokens: number;
}

interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  totalTokens: number;
  contextMetadata: {
    strategy: ContextStrategy['type'];
    tiersIncluded: number[];
    itemsDiscarded: number;
    summariesGenerated: number;
    dataFreshness: string;
    overallConfidence: 'high' | 'medium' | 'low';
    warnings: string[];
  };
}

interface ContextCollectionResult {
  success: boolean;
  items: ContextItem[];
  budget: TokenBudget;
  strategy: ContextStrategy;
  warnings: string[];
  partialAnalysis?: {
    reason: string;
    missingData: string[];
  };
}
```

---

## Regras de Segurança (Adições a agentSafetyRules.ts)

```typescript
// Novas constantes
export const CONTEXT_GUARDRAILS = {
  // Token budgets por agente
  tokenBudgets: {
    lead: 8000,
    contact: 6000,
    opportunity: 12000,
    client: 10000,
  },
  
  // Reservas obrigatórias
  systemPromptReserve: 2000,
  responseBufferReserve: 3000,
  
  // Limites de compressão
  maxSummaryLength: 500,
  minContextForAnalysis: 500,
  
  // Freshness thresholds
  staleDataWarningDays: 30,
  expiredDataDays: 90,
};

// Validações
export const CONTEXT_FORBIDDEN_PATTERNS = {
  NO_RAW_HISTORY: 'Histórico bruto de conversas nunca é injetado',
  NO_UNBOUNDED_CONTEXT: 'Contexto deve respeitar budget de tokens',
  NO_RANDOM_SELECTION: 'Seleção de contexto deve ser determinística',
  NO_LIVE_DATA_COMPRESSION: 'Dados CRM ao vivo nunca são comprimidos',
  NO_MEMORY_OVERRIDE: 'Memória não pode sobrepor dados ao vivo',
};
```

---

## Exemplo de Prompt Estruturado Final

```text
════════════════════════════════════════════════════════════════
[CONSTRAINTS & GUARDRAILS]

Tu és um agente de análise de leads para CRM. Regras obrigatórias:
- Nunca inventes dados que não foram fornecidos
- Não faças promessas em nome do negócio
- Todas as recomendações devem ser explicadas
- Confia nos dados ao vivo sobre memórias antigas

════════════════════════════════════════════════════════════════
[CURRENT ENTITY DATA]

Nome: Maria Santos
Email: maria@empresa.pt
Telefone: +351 912 345 678
Estado: qualified
Origem: instagram
Temperatura: hot
Score: 78
Última interação: há 3 dias

════════════════════════════════════════════════════════════════
[KNOWN FACTS - VALIDATED]

• Cliente já trabalhou com concorrente X (validado)
• Decisor é o CEO da empresa (validado)
• Orçamento aprovado para Q1 2026 (validado)

════════════════════════════════════════════════════════════════
[HISTORICAL PATTERNS]

Sumário de 5 conclusões anteriores:
- Lead consistentemente responsivo (média 2h de resposta)
- Preferência por comunicação via WhatsApp
- Interesse demonstrado em módulo de automação
- Objeção prévia sobre preço foi ultrapassada

════════════════════════════════════════════════════════════════
[CONTEXT METADATA]

Tokens utilizados: 1,847 / 6,000 (31%)
Frescura dos dados: última atualização há 3 dias
Confiança geral: alta
Estratégia: SMALL (contexto completo)

════════════════════════════════════════════════════════════════
[AGENT TASK]

Analisa este lead e fornece:
1. Sumário executivo (2-3 frases)
2. Avaliação do estado atual
3. Sinais positivos identificados
4. Indicadores de risco
5. Próxima ação recomendada

Usa a ferramenta analyze_lead para estruturar a resposta.
════════════════════════════════════════════════════════════════
```

---

## Casos de Falha (Failure Handling)

| Cenário | Comportamento |
|---------|---------------|
| Budget excedido após compressão | Abortar e retornar análise parcial |
| Sem dados TIER 1 (entidade) | Retornar erro com dados em falta |
| Memórias todas expiradas | Continuar com warning, sem TIER 2/3 |
| Sumarização falha | Usar dados originais até limite |
| Timeout na coleta | Retornar com dados já coletados |

**Resposta Parcial Estruturada:**
```json
{
  "partialAnalysis": true,
  "completedSteps": 3,
  "totalSteps": 5,
  "analysisPerformed": ["entity_data", "memory_retrieval", "pattern_analysis"],
  "missingData": ["conversation_history", "recent_activities"],
  "reason": "Token budget exceeded, TIER 3 data discarded",
  "recommendation": "Retry with smaller context window or prioritize critical data"
}
```

---

## Ordem de Implementação

1. **Fase 1 - Core Types** (30 min)
   - Criar `src/types/contextManager.ts`
   - Adicionar constantes a `agentSafetyRules.ts`

2. **Fase 2 - Shared Functions** (2h)
   - Criar `context-manager.ts` (token estimation)
   - Criar `context-collector.ts` (data gathering)
   - Criar `context-summarizer.ts` (compression)
   - Criar `prompt-assembler.ts` (formatting)

3. **Fase 3 - Agent Integration** (1.5h)
   - Modificar `ai-agent-orchestrator/index.ts`
   - Modificar `ai-agent-opportunity/index.ts`
   - Modificar `ai-agent-client/index.ts`

4. **Fase 4 - Deploy & Test** (30 min)
   - Deploy edge functions
   - Testar com entidades reais

---

## Métricas de Sucesso

| Métrica | Alvo |
|---------|------|
| Token usage per execution | < 80% do budget |
| Context selection determinism | 100% reprodutível |
| TIER 1 data inclusion | 100% sempre |
| Successful analyses | > 95% |
| Partial analysis rate | < 5% |
| Average execution time | < 5 segundos |

---

## Secção Técnica Detalhada

### Fórmula de Estimativa de Tokens

```typescript
function estimateTokens(text: string): number {
  // Regra aproximada: 1 token ≈ 4 caracteres em PT/EN
  // Adicionar 10% de margem de segurança
  return Math.ceil((text.length / 4) * 1.1);
}
```

### Algoritmo de Priorização

```typescript
function calculatePriority(item: ContextItem): number {
  let score = 0;
  
  // Base por tier
  score += (5 - item.tier) * 25; // TIER 1 = 100, TIER 4 = 25
  
  // Boost por relevância
  score += item.relevanceScore * 30;
  
  // Boost por frescura
  const daysSinceCreation = getDaysSince(item.timestamp);
  if (daysSinceCreation < 7) score += 20;
  else if (daysSinceCreation < 30) score += 10;
  
  // Boost máximo para dados ao vivo
  if (item.isLiveData) score = 200;
  
  return score;
}
```

### Estratégia de Compressão

```typescript
function selectStrategy(availableTokens: number): ContextStrategy {
  if (availableTokens < 4000) {
    return {
      type: 'LARGE',
      summarizeTiers: [2, 3],
      discardTiers: [4],
      maxContextTokens: availableTokens * 0.9,
    };
  } else if (availableTokens < 8000) {
    return {
      type: 'MEDIUM',
      summarizeTiers: [3, 4],
      discardTiers: [],
      maxContextTokens: availableTokens * 0.95,
    };
  } else {
    return {
      type: 'SMALL',
      summarizeTiers: [],
      discardTiers: [],
      maxContextTokens: availableTokens,
    };
  }
}
```
