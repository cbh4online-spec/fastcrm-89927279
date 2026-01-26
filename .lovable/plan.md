

# Agent Lifecycle & Orchestration Manager

## Arquitectura Actual (Já Implementado)

### O Que Existe
| Componente | Estado | Descrição |
|------------|--------|-----------|
| `ai-agent-orchestrator` | ✅ | Dispatcher central com routing básico |
| `ai-agent-opportunity` | ✅ | Agente especializado para oportunidades |
| `ai-agent-client` | ✅ | Agente especializado para retenção |
| `ai_agent_executions` | ✅ | Audit trail de execuções |
| `ai_agent_memory` | ✅ | Memória selectiva por entidade |
| `ai_agent_feedback` | ✅ | Sistema de feedback |
| `agentSafetyRules.ts` | ✅ | Guardrails e rate limiting (client-side) |

### Lacunas Identificadas
1. **Sem registo de agentes** - Configuração hardcoded, não dinâmica
2. **Sem controlo de execução paralela** - Sem locks para prevenir execuções simultâneas
3. **Sem fila de jobs** - Execuções síncronas apenas
4. **Sem scheduling** - Sem triggers automáticos (cron)
5. **Sem cooldown server-side** - Rate limiting apenas no cliente
6. **Sem estado de execução** - Sem tracking de running/queued/completed
7. **Sem priorização** - Sem ordenação por valor/urgência

---

## Componentes a Implementar

### 1. Tabela: `ai_agent_registry` (Agent Registration)
Registo dinâmico de todos os agentes disponíveis no sistema.

```sql
CREATE TABLE ai_agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Scopes
  entity_types TEXT[] NOT NULL,              -- ['lead', 'contact', 'opportunity']
  enabled_triggers agent_trigger[] NOT NULL, -- ['manual', 'entity_created', 'status_changed']
  
  -- Limits
  max_reasoning_iterations INTEGER DEFAULT 5,
  max_tool_calls INTEGER DEFAULT 10,
  timeout_ms INTEGER DEFAULT 30000,
  cooldown_ms INTEGER DEFAULT 5000,
  max_executions_per_hour_entity INTEGER DEFAULT 10,
  max_executions_per_hour_workspace INTEGER DEFAULT 100,
  
  -- State
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 50,               -- Higher = runs first
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Tabela: `ai_agent_jobs` (Job Queue)
Fila persistente para execuções agendadas e assíncronas.

```sql
CREATE TABLE ai_agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  
  -- Job definition
  agent_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_type agent_trigger NOT NULL,
  priority INTEGER DEFAULT 50,
  context JSONB DEFAULT '{}',
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- State
  status job_status NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
  execution_id UUID REFERENCES ai_agent_executions(id),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE (workspace_id, agent_type, entity_id, status) 
    WHERE status IN ('pending', 'running')  -- Prevent duplicates for pending/running
);

CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE agent_trigger AS ENUM ('manual', 'entity_created', 'status_changed', 'time_based', 'message_received');
```

### 3. Tabela: `ai_agent_locks` (Execution Control)
Sistema de locks para prevenir execuções paralelas conflituantes.

```sql
CREATE TABLE ai_agent_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  agent_type TEXT NOT NULL,
  
  locked_at TIMESTAMPTZ DEFAULT now(),
  locked_by UUID,
  expires_at TIMESTAMPTZ NOT NULL,          -- Auto-expire para safety
  
  UNIQUE (workspace_id, entity_id, agent_type)
);
```

### 4. Tabela: `ai_agent_schedules` (Recurring Jobs)
Definição de análises periódicas automáticas.

```sql
CREATE TABLE ai_agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  
  -- Schedule definition
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL,
  entity_filter JSONB DEFAULT '{}',         -- Filter entities to analyze
  
  -- Timing
  cron_expression TEXT NOT NULL,            -- '0 9 * * *' = daily at 9am
  timezone TEXT DEFAULT 'Europe/Lisbon',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  -- Limits
  max_entities_per_run INTEGER DEFAULT 50,
  priority INTEGER DEFAULT 30,              -- Lower than manual
  
  -- State
  is_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

## Edge Functions

### 5. `ai-agent-lifecycle/index.ts` (Lifecycle Manager)
Gestão central do ciclo de vida dos agentes.

**Responsabilidades:**
- Registar e validar agentes
- Verificar limites antes de execução
- Gerir locks de entidade
- Criar/actualizar jobs
- Gravar estado de execução

**Endpoints:**
```text
POST /dispatch     - Criar novo job
POST /cancel       - Cancelar job pendente
GET  /status/:id   - Estado de um job
GET  /queue        - Lista de jobs pendentes
POST /acquire-lock - Obter lock para execução
POST /release-lock - Libertar lock
```

### 6. `ai-agent-scheduler/index.ts` (Scheduler)
Processador de jobs agendados, chamado por Cron.

**Responsabilidades:**
- Processar schedules activos
- Identificar entidades que precisam reanálise
- Criar jobs na fila
- Throttling por workspace
- Rate limiting robusto

**Cron Job:**
```sql
-- Executar a cada 5 minutos
SELECT cron.schedule(
  'agent-scheduler',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://{project-ref}.supabase.co/functions/v1/ai-agent-scheduler',
    headers:='{"Authorization": "Bearer {anon-key}"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

### 7. `ai-agent-processor/index.ts` (Job Processor)
Processador de jobs pendentes na fila.

**Responsabilidades:**
- Buscar jobs pendentes ordenados por prioridade
- Adquirir locks
- Chamar agente especializado
- Actualizar estado do job
- Libertar locks
- Gravar execução no audit trail

**Lógica:**
```text
1. Buscar próximo job (status=pending, scheduled_for <= now)
2. Verificar lock disponível para entity_id
3. Adquirir lock com TTL de 60s
4. Actualizar job para status=running
5. Chamar agente correspondente
6. Actualizar job para completed/failed
7. Libertar lock
8. Repetir até não haver jobs ou limite atingido
```

---

## Diagrama de Arquitectura

```text
+------------------------------------------------------------------+
|                    AGENT LIFECYCLE MANAGER                       |
|  (Registration, Validation, Locking, Queue Management)           |
+------------------------------------------------------------------+
         |                    |                    |
    +----v----+          +----v----+          +----v----+
    |  QUEUE  |          | LOCKS   |          |REGISTRY |
    | ai_agent|          |ai_agent |          |ai_agent |
    |  _jobs  |          | _locks  |          |_registry|
    +---------+          +---------+          +---------+
         |
    +----v----------------------------------------------------+
    |                    JOB PROCESSOR                         |
    |  (Dequeue, Execute, Record, Release)                     |
    +----------------------------------------------------------+
         |              |              |              |
    +----v----+   +----v----+   +----v----+   +----v----+
    |  LEAD   |   | CONTACT |   |   OPP   |   | CLIENT  |
    |  AGENT  |   |  AGENT  |   |  AGENT  |   |  AGENT  |
    +---------+   +---------+   +---------+   +---------+
         |              |              |              |
    +----v----------------------------------------------------+
    |                    AUDIT TRAIL                           |
    |  ai_agent_executions + ai_agent_memory                   |
    +----------------------------------------------------------+
```

---

## Hooks e Componentes UI

### 8. `useAgentLifecycle.ts` (Hook Principal)
```typescript
export function useAgentLifecycle(entityId: string, entityType: string) {
  return {
    // Job management
    dispatch: (agentType, trigger, priority?) => Promise<JobId>,
    cancel: (jobId) => Promise<void>,
    
    // Status
    pendingJobs: Job[],
    runningJobs: Job[],
    lastExecution: AgentExecution,
    
    // Availability
    isLocked: boolean,
    canDispatch: boolean,
    cooldownRemaining: number,
  };
}
```

### 9. `useAgentSchedules.ts` (Schedules Management)
```typescript
export function useAgentSchedules(workspaceId: string) {
  return {
    schedules: Schedule[],
    create: (schedule) => Promise<Schedule>,
    update: (id, schedule) => Promise<Schedule>,
    delete: (id) => Promise<void>,
    toggle: (id, enabled) => Promise<void>,
  };
}
```

### 10. `AgentQueueStatus.tsx` (UI Component)
Card que mostra estado da fila para uma entidade:
- Jobs pendentes com tempo estimado
- Job em execução (se houver)
- Última execução com resultado
- Botão para dispatch manual

### 11. `AgentSchedulesManager.tsx` (Admin Component)
Painel de administração para configurar schedules:
- Lista de schedules activos
- Criar/editar schedule
- Histórico de execuções
- Toggle enable/disable

---

## Regras de Orquestração

### Priorização de Execução
```text
Priority 100: Manual user-initiated
Priority 80:  Status changed (urgent signals)
Priority 60:  Entity created  
Priority 40:  Message received
Priority 20:  Time-based (scheduled)
```

### Execução Paralela (Permitida)
```text
✅ Agentes diferentes em entidades diferentes
✅ Mesmo agente em entidades diferentes
✅ Agentes não-conflituantes na mesma entidade (read-only tools)
```

### Execução Paralela (Bloqueada)
```text
❌ Mesmo agente na mesma entidade
❌ Agentes que modificam estado na mesma entidade
```

### Failure Handling
```text
1. Job falha → attempts += 1
2. Se attempts < max_attempts → reagendar com backoff (5min, 15min, 60min)
3. Se attempts >= max_attempts → status = failed, notificar
4. Locks expiram automaticamente após TTL
5. Nenhum retry automático para erros de validação
```

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/migrations/xxx_agent_lifecycle_tables.sql` | Tabelas de suporte |
| `supabase/functions/ai-agent-lifecycle/index.ts` | Lifecycle Manager API |
| `supabase/functions/ai-agent-scheduler/index.ts` | Scheduler (Cron) |
| `supabase/functions/ai-agent-processor/index.ts` | Job Processor |
| `src/hooks/useAgentLifecycle.ts` | Hook principal |
| `src/hooks/useAgentSchedules.ts` | Gestão de schedules |
| `src/components/ai-agents/AgentQueueStatus.tsx` | Status da fila |
| `src/components/ai-agents/AgentSchedulesManager.tsx` | Admin schedules |
| `src/types/agentLifecycle.ts` | Tipos TypeScript |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/agentSafetyRules.ts` | Adicionar validação de jobs |
| `src/hooks/useAgentAnalysis.ts` | Integrar com lifecycle |
| `supabase/functions/ai-agent-orchestrator/index.ts` | Usar lifecycle para locks |

---

## Output Contract (Lifecycle Manager)

Cada operação do Lifecycle Manager retorna:
```typescript
interface LifecycleResponse {
  // Identification
  jobId: string;
  agentType: AgentType;
  entityId: string;
  
  // Status
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Timing
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  
  // Result (if completed)
  executionId?: string;
  success?: boolean;
  
  // Error (if failed)
  errorMessage?: string;
  attempts: number;
  
  // Queue position
  queuePosition?: number;
  estimatedWaitMs?: number;
}
```

---

## Ordem de Implementação

### Passo 1: Database Schema
1. Criar tipos ENUM (job_status, agent_trigger)
2. Criar tabela ai_agent_registry
3. Criar tabela ai_agent_jobs
4. Criar tabela ai_agent_locks
5. Criar tabela ai_agent_schedules
6. Seed inicial do registry

### Passo 2: Lifecycle Manager Edge Function
1. Criar ai-agent-lifecycle
2. Implementar /dispatch
3. Implementar /acquire-lock, /release-lock
4. Implementar /status, /queue
5. Implementar /cancel

### Passo 3: Job Processor
1. Criar ai-agent-processor
2. Implementar dequeue logic
3. Integrar com agentes existentes
4. Implementar retry com backoff

### Passo 4: Scheduler
1. Criar ai-agent-scheduler
2. Implementar schedule evaluation
3. Configurar Cron job
4. Implementar throttling

### Passo 5: Frontend Integration
1. Criar hooks (useAgentLifecycle, useAgentSchedules)
2. Criar componentes (AgentQueueStatus, AgentSchedulesManager)
3. Integrar com páginas existentes

---

## Métricas de Sucesso

| Métrica | Target |
|---------|--------|
| Tempo médio de dispatch | < 100ms |
| Tempo médio de execução | < 10s |
| Jobs perdidos | 0% |
| Conflitos de lock | 0% |
| Uptime do scheduler | 99.9% |
| Falhas não-recuperadas | < 1% |

