
# Fases Seguintes: AI Agents Architecture

## Estado Actual (Já Implementado)

### Fase 1 ✅ - Tabelas de Suporte
- `ai_agent_executions` - Audit trail
- `ai_agent_memory` - Memória selectiva
- `ai_agent_feedback` - Avaliação de feedback

### Fase 2 ✅ - Orchestrator Base
- `ai-agent-orchestrator/index.ts` - Dispatcher central com routing e análise base
- Hooks: `useAgentAnalysis`, `useAgentHistory`, `useAgentFeedback`
- Componentes: `AgentInsightCard`, `AgentReasoningTrace`, `AgentFeedbackButtons`

---

## Fase 3: Agentes Especializados (Opportunity + Client)

### 3.1 Opportunity Agent
**Responsabilidade**: Probabilidade & Risco

Criar `supabase/functions/ai-agent-opportunity/index.ts` que:
- Chama internamente o `ai-opportunity-coach` existente
- Formata output segundo contrato obrigatório
- Calcula probabilidade de fecho ajustada
- Identifica riscos de perda
- Detecta stagnação no funil

**Lógica Principal:**
```text
1. Buscar dados da oportunidade (valor, stage, datas)
2. Buscar contacto/empresa associados
3. Calcular tempo no funil vs média
4. Identificar sinais de alerta (sem actividade, valor alto sem movimento)
5. Chamar ai-opportunity-coach para análise IA profunda
6. Formatar output: executiveSummary, keySignals, riskIndicators, recommendedAction
7. Gravar em ai_agent_executions
```

### 3.2 Client Agent
**Responsabilidade**: Saúde & Retenção

Criar `supabase/functions/ai-agent-client/index.ts` que:
- Analisa contactos/empresas com histórico de compras
- Calcula health score baseado em interacções
- Detecta sinais de churn (inactividade, reclamações)
- Identifica oportunidades de upsell
- Sugere acções de retenção

**Lógica Principal:**
```text
1. Buscar dados do contacto/empresa
2. Buscar oportunidades ganhas (cliente existente)
3. Analisar frequência de compras e valor total
4. Verificar última interacção
5. Identificar produtos/serviços complementares
6. Gerar análise de saúde e recomendações
7. Gravar em ai_agent_executions
```

---

## Fase 4: Integração UI nas Páginas de Entidade

### 4.1 Lead Detail Page
Modificar `src/components/crm/LeadDetailWithSidebar.tsx`:
- Adicionar nova secção "Análise IA" no menu lateral
- Substituir o botão "Analisar IA" actual pelo `AgentInsightCard`
- Mostrar última análise do Lead Agent automaticamente

### 4.2 Opportunity Detail Page
Modificar `src/components/opportunities/OpportunityDetailPage.tsx`:
- Adicionar tab "Insights IA"
- Integrar `AgentInsightCard` com output do Opportunity Agent
- Botão para forçar nova análise

### 4.3 Contact/Company Detail Pages
- Integrar Client Agent nas páginas de detalhe
- Mostrar health score e recomendações de retenção

---

## Fase 5: Refactoring das Funções Existentes

### 5.1 Integrar `ai-analyze-lead` no Orchestrator
- O Lead Agent no orchestrator chama `ai-analyze-lead` como "tool"
- Formata output para contrato padronizado
- Mantém compatibilidade com código existente

### 5.2 Integrar `ai-opportunity-coach` no Opportunity Agent
- Chamar internamente e transformar output
- Adicionar campos do contrato obrigatório

### 5.3 Criar wrapper para `ai-entity-insights`
- Usar como serviço partilhado por todos os agentes

---

## Fase 6: Triggers Automáticos

### 6.1 Database Triggers
Criar triggers SQL para executar agentes automaticamente:

```sql
-- Trigger para lead criado
CREATE FUNCTION trigger_lead_agent_on_create()
-- Insere job na fila ou chama webhook

-- Trigger para status changed
CREATE FUNCTION trigger_agent_on_status_change()
-- Detecta mudança de status e agenda análise
```

### 6.2 Scheduled Jobs
Usar Supabase Cron para:
- Análise diária de leads inativos (>7 dias sem contacto)
- Health check semanal de clientes
- Alerta de oportunidades estagnadas

### 6.3 Edge Function: `ai-agent-scheduler`
```text
- Executar periodicamente via cron
- Identificar entidades que precisam reanálise
- Rate limit para não sobrecarregar
- Logging detalhado
```

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/functions/ai-agent-opportunity/index.ts` | Opportunity Agent especializado |
| `supabase/functions/ai-agent-client/index.ts` | Client/Retention Agent |
| `supabase/functions/ai-agent-scheduler/index.ts` | Scheduler para triggers automáticos |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/crm/LeadDetailWithSidebar.tsx` | Integrar AgentInsightCard na secção de insights |
| `src/components/opportunities/OpportunityDetailPage.tsx` | Adicionar tab de análise IA |
| `src/components/entity/EntitySidebarMenu.tsx` | Adicionar item "Análise IA" se aplicável |
| `supabase/functions/ai-agent-orchestrator/index.ts` | Routing para novos agentes |
| `supabase/config.toml` | Registar novas edge functions |

---

## Ordem de Implementação

### Passo 1: Opportunity Agent
1. Criar edge function `ai-agent-opportunity`
2. Integrar com `ai-opportunity-coach` existente
3. Testar com oportunidade real

### Passo 2: Client Agent
1. Criar edge function `ai-agent-client`
2. Implementar cálculo de health score
3. Testar com contacto que tem oportunidades ganhas

### Passo 3: Integração Lead Detail
1. Modificar `LeadDetailWithSidebar.tsx`
2. Adicionar `AgentInsightCard` à secção "Insights"
3. Conectar hook `useAgentAnalysis`

### Passo 4: Integração Opportunity Detail
1. Modificar `OpportunityDetailPage.tsx`
2. Adicionar tab "Insights IA"
3. Conectar Opportunity Agent

### Passo 5: Actualizar Orchestrator
1. Adicionar routing para `opportunity` e `client` agents
2. Melhorar lógica de análise específica por tipo

### Passo 6: Scheduler (Opcional)
1. Criar `ai-agent-scheduler`
2. Configurar cron job no Supabase
3. Implementar rate limiting robusto

---

## Métricas de Sucesso

- Tempo médio de análise < 5 segundos
- Taxa de erro < 5%
- Feedback positivo > 70% nas primeiras 100 execuções
- Cobertura: 100% dos leads/oportunidades acessíveis via UI
