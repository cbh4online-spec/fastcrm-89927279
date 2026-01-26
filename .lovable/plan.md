
# Integração de Componentes AI - Entity Pages & Settings

## Resumo

Integrar os componentes do Memory System e Agent Lifecycle nas páginas de entidade (Contact, Lead, Opportunity) e na secção de Settings > Automação & IA.

---

## Componentes a Integrar

| Componente | Destino | Estado Atual |
|------------|---------|--------------|
| `AgentQueueStatus` | Contact, Lead, Opportunity | Criado, não integrado |
| `EntityMemoryPanel` | Contact, Lead, Opportunity | Criado, não integrado |
| `AgentSchedulesManager` | Settings > Automation | Criado, não integrado |

---

## Alterações por Ficheiro

### 1. Contact Detail Page

**Ficheiro:** `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`

**Alterações:**
- Importar `AgentQueueStatus` e `EntityMemoryPanel`
- Adicionar secção "IA & Memória" no menu lateral (nova `MenuSection`)
- Integrar ambos os componentes na secção de insights ou criar nova secção

**Localização na UI:**
- Na secção `insights` existente, adicionar:
  - `AgentQueueStatus` (estado da análise IA)
  - `EntityMemoryPanel` (memórias guardadas)

---

### 2. Lead Detail Page

**Ficheiro:** `src/components/crm/LeadDetailWithSidebar.tsx`

**Alterações:**
- Importar `AgentQueueStatus` e `EntityMemoryPanel`
- Adicionar na secção `insights`:
  - `AgentQueueStatus` com `compact={true}` no header ou lateral
  - `EntityMemoryPanel` na área principal

**Localização na UI:**
- Secção `insights` já tem `LeadAgentInsightsSection`
- Adicionar `EntityMemoryPanel` abaixo dos insights
- Adicionar `AgentQueueStatus` no topo da secção insights

---

### 3. Opportunity Detail Page

**Ficheiro:** `src/components/opportunities/OpportunityDetailPage.tsx`

**Alterações:**
- Importar `AgentQueueStatus` e `EntityMemoryPanel`
- Adicionar na tab `insights`:
  - `AgentQueueStatus` compact no header da tab
  - `EntityMemoryPanel` abaixo do `OpportunityAIInsightsSection`

---

### 4. Settings - Automation & AI

**Ficheiro:** `src/components/settings/sections/AutomationAISettings.tsx`

**Alterações:**
- Importar `AgentSchedulesManager`
- Adicionar nova secção "Agendamentos de Análise IA"
- Integrar o componente `AgentSchedulesManager` dentro desta secção

**Posição na UI:**
- Depois da secção "Sugestões de IA"
- Antes da secção "Logs de Automação"

---

### 5. Configuração do Cron Job

**Acção:** Executar SQL para configurar o cron job

```sql
SELECT cron.schedule(
  'ai-agent-scheduler-hourly',
  '0 * * * *',  -- A cada hora
  $$
  SELECT net.http_post(
    url := 'https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/ai-agent-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bW5ma2NjeXZseW95amNoaXdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjM2ODksImV4cCI6MjA4Mzg5OTY4OX0.l5wSvF6cyPUfA2oSIgwr0mvC9gxzMj3fWbhqbrdXOd8"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Visão Geral das Alterações

```text
+------------------------------------------+
|           CONTACT DETAIL PAGE            |
|------------------------------------------|
|  Secção: Insights                        |
|  +------------------------------------+  |
|  | [AgentQueueStatus compact]         |  |
|  +------------------------------------+  |
|  | AIInsightsSection                  |  |
|  | EntitySocialMediaAnalysisSection   |  |
|  | [EntityMemoryPanel]                |  |
|  +------------------------------------+  |
+------------------------------------------+

+------------------------------------------+
|            LEAD DETAIL PAGE              |
|------------------------------------------|
|  Secção: Insights                        |
|  +------------------------------------+  |
|  | [AgentQueueStatus compact]         |  |
|  +------------------------------------+  |
|  | LeadAgentInsightsSection           |  |
|  | InsightsSidebar                    |  |
|  | EntitySocialMediaAnalysisSection   |  |
|  | [EntityMemoryPanel]                |  |
|  +------------------------------------+  |
+------------------------------------------+

+------------------------------------------+
|        OPPORTUNITY DETAIL PAGE           |
|------------------------------------------|
|  Tab: Insights IA                        |
|  +------------------------------------+  |
|  | [AgentQueueStatus compact]         |  |
|  +------------------------------------+  |
|  | OpportunityAIInsightsSection       |  |
|  | [EntityMemoryPanel]                |  |
|  +------------------------------------+  |
+------------------------------------------+

+------------------------------------------+
|         SETTINGS - AUTOMATION & AI       |
|------------------------------------------|
|  ... outras secções ...                  |
|  +------------------------------------+  |
|  | Sugestões de IA                    |  |
|  +------------------------------------+  |
|  | [AgentSchedulesManager] <- NOVO    |  |
|  +------------------------------------+  |
|  | Logs de Automação                  |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

## Ficheiros a Modificar

| Ficheiro | Tipo de Alteração |
|----------|-------------------|
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Adicionar imports + componentes na secção insights |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Adicionar imports + componentes na secção insights |
| `src/components/opportunities/OpportunityDetailPage.tsx` | Adicionar imports + componentes na tab insights |
| `src/components/settings/sections/AutomationAISettings.tsx` | Adicionar AgentSchedulesManager |

---

## Ordem de Implementação

1. **Settings > Automation & AI** - Adicionar `AgentSchedulesManager`
2. **Contact Detail** - Integrar `AgentQueueStatus` e `EntityMemoryPanel`
3. **Lead Detail** - Integrar `AgentQueueStatus` e `EntityMemoryPanel`
4. **Opportunity Detail** - Integrar `AgentQueueStatus` e `EntityMemoryPanel`
5. **Cron Job** - Configurar agendamento automático

---

## Secção Técnica

### Imports a adicionar

```typescript
// Nas páginas de entidade:
import { AgentQueueStatus } from "@/components/ai-agents/AgentQueueStatus";
import { EntityMemoryPanel } from "@/components/ai-agents/EntityMemoryPanel";

// Em AutomationAISettings:
import { AgentSchedulesManager } from "@/components/ai-agents/AgentSchedulesManager";
```

### Props do AgentQueueStatus
```typescript
<AgentQueueStatus
  entityId={id!}
  entityType="contact" // ou "lead" ou "opportunity"
  compact={true}
  showAnalyzeButton={true}
/>
```

### Props do EntityMemoryPanel
```typescript
<EntityMemoryPanel
  entityId={id!}
  entityType="contact" // ou "lead" ou "opportunity"
  entityName={contact.name}
  compact={false}
/>
```
