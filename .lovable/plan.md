
# AI Agents Architecture – CRM Decision Intelligence

## Análise da Arquitectura Actual

### Funções de IA Existentes (Edge Functions)
O CRM já possui uma base sólida de funções de IA dispersas:

| Função | Responsabilidade |
|--------|------------------|
| `ai-analyze-lead` | Qualificação e scoring de leads |
| `ai-analyze-entity` | Análise de contactos/empresas |
| `ai-entity-insights` | Insights operacionais por entidade |
| `ai-opportunity-coach` | Sales coaching para oportunidades |
| `ai-copilot` | Classificação, extracção e sugestões |
| `conversation-intelligence` | Análise de intenção de compra |
| `ai-growth-insights` | Insights de crescimento |

### Regras de Segurança Existentes
O ficheiro `src/lib/aiSafetyRules.ts` já define:
- Acções críticas que requerem confirmação
- Rate limiting para sugestões
- Separação clara entre operações permitidas e proibidas

### Lacunas Identificadas
1. **Sem orquestração central** – Funções isoladas sem coordenação
2. **Sem audit trail estruturado** – Logs dispersos sem rastreabilidade
3. **Sem formato de output padronizado** – Cada função tem estrutura diferente
4. **Sem lifecycle management** – Execução ad-hoc sem triggers sistemáticos
5. **Sem memória selectiva** – Contexto completo enviado sempre

---

## Arquitectura Proposta: Agent Layer

### Diagrama de Arquitectura

```text
+---------------------------------------------------------------+
|                    AGENT ORCHESTRATOR                         |
|  (Central dispatcher, routing, rate limiting, audit)          |
+---------------------------------------------------------------+
         |              |              |              |
    +----v----+   +----v----+   +----v----+   +----v----+
    |  LEAD   |   | CONTACT |   |   OPP   |   | CLIENT  |
    |  AGENT  |   |  AGENT  |   |  AGENT  |   |  AGENT  |
    +---------+   +---------+   +---------+   +---------+
         |              |              |              |
+---------------------------------------------------------------+
|                    SHARED SERVICES                            |
|  Memory Manager | Tool Registry | Output Formatter | Audit   |
+---------------------------------------------------------------+
         |              |              |              |
+---------------------------------------------------------------+
|                    DATA LAYER                                 |
|  Supabase Tables | Edge Functions | External APIs             |
+---------------------------------------------------------------+
```

---

## Componentes a Implementar

### 1. Tabelas de Suporte (Migrations)

#### `ai_agent_executions` – Audit Trail
```sql
CREATE TABLE ai_agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  agent_type TEXT NOT NULL, -- 'lead', 'contact', 'opportunity', 'client'
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'manual', 'entity_created', 'status_changed', 'time_based'
  
  -- Execution details
  input_summary JSONB NOT NULL,
  reasoning_trace JSONB NOT NULL, -- Steps taken during analysis
  output JSONB NOT NULL,
  
  -- Output contract fields
  executive_summary TEXT NOT NULL,
  status_assessment TEXT,
  key_signals TEXT[],
  risk_indicators TEXT[],
  recommended_action TEXT,
  recommended_action_type TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Performance
  duration_ms INTEGER,
  tokens_used INTEGER,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_executions_entity ON ai_agent_executions(entity_type, entity_id);
CREATE INDEX idx_agent_executions_workspace ON ai_agent_executions(workspace_id, created_at DESC);
```

#### `ai_agent_memory` – Selective Memory
```sql
CREATE TABLE ai_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  
  memory_type TEXT NOT NULL, -- 'conclusion', 'user_feedback', 'important_signal'
  content TEXT NOT NULL,
  relevance_score NUMERIC(3,2) DEFAULT 1.0,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_agent_memory_entity ON ai_agent_memory(entity_type, entity_id);
```

#### `ai_agent_feedback` – Evaluation Loop
```sql
CREATE TABLE ai_agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES ai_agent_executions(id),
  
  feedback_type TEXT NOT NULL, -- 'useful', 'not_useful', 'action_taken', 'action_ignored'
  feedback_notes TEXT,
  outcome TEXT, -- What actually happened after the recommendation
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

### 2. Edge Functions – Agentes Especializados

#### 2.1 `ai-agent-orchestrator/index.ts` – Dispatcher Central
Responsabilidades:
- Recebe pedidos e roteia para o agente correcto
- Aplica rate limiting e validação
- Gere lifecycle (triggers, scheduling)
- Regista execuções no audit trail
- Formata outputs segundo contrato

```typescript
// Pseudo-código da estrutura
interface AgentRequest {
  agentType: 'lead' | 'contact' | 'opportunity' | 'client';
  entityId: string;
  triggerType: 'manual' | 'entity_created' | 'status_changed' | 'time_based';
  context?: Record<string, unknown>;
}

interface AgentResponse {
  // Output Contract (OBRIGATÓRIO)
  executiveSummary: string;
  statusAssessment: string;
  keySignals: string[];
  riskIndicators: string[];
  recommendedAction: string;
  recommendedActionType: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  
  // Metadata
  reasoningTrace: ReasoningStep[];
  dataSourcesUsed: string[];
  executionId: string;
}
```

#### 2.2 `ai-agent-lead/index.ts` – Lead Agent
Responsabilidade única: **Qualificação & Intenção**

Capacidades:
- Avaliar temperatura (cold/warm/hot)
- Calcular lead score (0-100)
- Classificar tipo (prospect, cliente, spam, etc.)
- Detectar intenção de compra
- Recomendar próxima acção

Padrão: **Plan-and-Execute**
1. Planear: Que dados preciso analisar?
2. Executar: Analisar mensagens, histórico, sinais
3. Replanear: Ajustar se dados contraditórios

#### 2.3 `ai-agent-opportunity/index.ts` – Opportunity Agent
Responsabilidade única: **Probabilidade & Risco**

Capacidades:
- Avaliar probabilidade de fecho
- Identificar riscos de perda
- Calcular valor ponderado
- Detectar stagnação no funil
- Sugerir tácticas de fecho

Padrão: **Plan-and-Execute**

#### 2.4 `ai-agent-client/index.ts` – Client Agent
Responsabilidade única: **Saúde & Retenção**

Capacidades:
- Calcular health score
- Detectar sinais de churn
- Identificar oportunidades de upsell
- Monitorizar satisfação
- Sugerir acções de retenção

Padrão: **Plan-and-Execute** com ReAct limitado para análise profunda

---

### 3. Tipos TypeScript – Contratos

#### `src/types/aiAgents.ts`
```typescript
// Agent Types
export type AgentType = 'lead' | 'contact' | 'opportunity' | 'client';

// Trigger Types
export type AgentTrigger = 
  | 'manual'           // User clicked "Analyze"
  | 'entity_created'   // New entity added
  | 'status_changed'   // Status/stage changed
  | 'time_based'       // Scheduled analysis
  | 'message_received'; // New message in conversation

// Confidence Levels
export type ConfidenceLevel = 'low' | 'medium' | 'high';

// Output Contract (MANDATORY for all agents)
export interface AgentOutput {
  executiveSummary: string;      // Plain business language
  statusAssessment: string;      // Current state
  keySignals: string[];          // Observed signals
  riskIndicators: string[];      // If any
  recommendedAction: string;     // Next best action
  recommendedActionType: AgentActionType;
  confidenceLevel: ConfidenceLevel;
}

// Action Types per Agent
export type LeadAgentAction = 
  | 'reply_manual'
  | 'send_template'
  | 'create_opportunity'
  | 'qualify'
  | 'nurture'
  | 'archive';

export type OpportunityAgentAction =
  | 'send_proposal'
  | 'schedule_meeting'
  | 'follow_up_urgently'
  | 'add_stakeholder'
  | 'negotiate_terms'
  | 'close_won'
  | 'close_lost';

export type ClientAgentAction =
  | 'check_satisfaction'
  | 'upsell_opportunity'
  | 'retention_outreach'
  | 'schedule_review'
  | 'escalate_issue';

// Reasoning Trace (for auditability)
export interface ReasoningStep {
  step: number;
  action: string;
  input: string;
  output: string;
  confidence: number;
}

// Execution Record
export interface AgentExecution {
  id: string;
  agentType: AgentType;
  entityId: string;
  entityType: string;
  triggerType: AgentTrigger;
  output: AgentOutput;
  reasoningTrace: ReasoningStep[];
  dataSourcesUsed: string[];
  durationMs: number;
  tokensUsed: number;
  createdAt: string;
}

// Memory Entry
export interface AgentMemory {
  id: string;
  entityId: string;
  memoryType: 'conclusion' | 'user_feedback' | 'important_signal';
  content: string;
  relevanceScore: number;
  expiresAt: string | null;
}
```

---

### 4. Hooks de UI

#### `src/hooks/useAgentAnalysis.ts`
```typescript
export function useAgentAnalysis(
  agentType: AgentType,
  entityId: string,
  entityType: string
) {
  // Triggers agent analysis
  // Returns: output, reasoning, loading state
  // Handles: rate limiting, error states, confirmation for actions
}
```

#### `src/hooks/useAgentHistory.ts`
```typescript
export function useAgentHistory(entityId: string) {
  // Fetches past agent executions for the entity
  // Returns: list of executions with reasoning traces
}
```

#### `src/hooks/useAgentFeedback.ts`
```typescript
export function useAgentFeedback() {
  // Submits feedback on agent recommendations
  // Tracks: action taken, outcome, usefulness
}
```

---

### 5. Componentes de UI

#### `src/components/ai-agents/AgentInsightCard.tsx`
Exibe o output do agente seguindo o contrato:
- Executive Summary em destaque
- Status Assessment
- Key Signals (badges)
- Risk Indicators (alerts)
- Recommended Action (botão de acção)
- Confidence Level (indicador visual)
- "Ver raciocínio" (expande reasoning trace)

#### `src/components/ai-agents/AgentReasoningTrace.tsx`
Mostra passo-a-passo como o agente chegou à conclusão:
- Lista de steps
- Dados usados em cada step
- Confiança parcial

#### `src/components/ai-agents/AgentFeedbackButtons.tsx`
- "Útil" / "Não útil"
- "Acção executada" / "Acção ignorada"
- Campo para notas

---

## Regras de Segurança e Guardrails

### Anti-Padrões Bloqueados (código)
```typescript
// Em src/lib/agentSafetyRules.ts
export const AGENT_GUARDRAILS = {
  // Autonomia limitada
  maxReasoningIterations: 5,       // Prevent infinite loops
  maxToolCallsPerExecution: 10,    // Limit tool usage
  
  // Acções proibidas sem confirmação
  prohibitedAutoActions: [
    'send_message',
    'create_opportunity',
    'delete_entity',
    'change_stage',
  ],
  
  // Rate limiting
  maxExecutionsPerEntity: 10,      // Per hour
  maxExecutionsPerWorkspace: 100,  // Per hour
  
  // Memory limits
  maxMemoryEntriesPerEntity: 50,
  memoryRetentionDays: 90,
};
```

### Failure Handling
Cada agente deve:
1. Retornar análise parcial se dados insuficientes
2. Indicar claramente o que falta
3. Sugerir como obter dados em falta
4. Nunca inventar informação

---

## Ficheiros a Criar/Modificar

### Novos Ficheiros

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/functions/ai-agent-orchestrator/index.ts` | Dispatcher central |
| `supabase/functions/ai-agent-lead/index.ts` | Lead Agent especializado |
| `supabase/functions/ai-agent-opportunity/index.ts` | Opportunity Agent |
| `supabase/functions/ai-agent-client/index.ts` | Client/Retention Agent |
| `src/types/aiAgents.ts` | Tipos e contratos |
| `src/lib/agentSafetyRules.ts` | Guardrails e limites |
| `src/hooks/useAgentAnalysis.ts` | Hook para análise |
| `src/hooks/useAgentHistory.ts` | Hook para histórico |
| `src/hooks/useAgentFeedback.ts` | Hook para feedback |
| `src/components/ai-agents/AgentInsightCard.tsx` | Card de output |
| `src/components/ai-agents/AgentReasoningTrace.tsx` | Trace visual |
| `src/components/ai-agents/AgentFeedbackButtons.tsx` | Feedback UI |

### Migrations

| Migration | Descrição |
|-----------|-----------|
| `create_ai_agent_executions_table` | Audit trail |
| `create_ai_agent_memory_table` | Memória selectiva |
| `create_ai_agent_feedback_table` | Loop de avaliação |

---

## Integração com Funções Existentes

As funções existentes serão **mantidas** mas **refactored** para serem chamadas pelo Orchestrator:
- `ai-analyze-lead` → Chamada pelo Lead Agent
- `ai-opportunity-coach` → Chamada pelo Opportunity Agent
- `ai-entity-insights` → Serviço partilhado por todos os agentes
- `conversation-intelligence` → Ferramenta no tool registry

---

## Benefícios da Arquitectura

1. **Clareza** – Cada agente tem responsabilidade única
2. **Auditabilidade** – Todas as decisões são rastreáveis
3. **Explicabilidade** – Output contract garante transparência
4. **Segurança** – Guardrails impedem autonomia excessiva
5. **Escalabilidade** – Novos agentes podem ser adicionados
6. **Qualidade** – Feedback loop permite melhorias contínuas

---

## Ordem de Implementação

1. **Fase 1**: Tabelas de suporte + Tipos TypeScript
2. **Fase 2**: Agent Orchestrator + Lead Agent
3. **Fase 3**: Opportunity Agent + Client Agent
4. **Fase 4**: UI Components + Hooks
5. **Fase 5**: Integração com funções existentes
6. **Fase 6**: Triggers automáticos (entity_created, status_changed)
