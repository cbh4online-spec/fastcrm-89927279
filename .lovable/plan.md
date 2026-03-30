

## Fase 3 — Motor de SLA Configurável e Automações para o Helpdesk

### Estado Atual

- `ticket_sla_rules` já existe na DB com campos `first_response_hours`, `resolution_hours`, `escalation_after_hours`, `escalate_to`
- Hook `useTicketSLARules` já funciona (CRUD via upsert)
- `TicketsSettings.tsx` já tem UI básica de SLA (tabela editável) e canned responses
- `automation_rules` já existe como sistema global com 30+ triggers — **não há triggers específicos de tickets/helpdesk**
- Não existe página `/dashboard/helpdesk/sla-policies` nem `/dashboard/helpdesk/automations`
- Não há lógica de auto-assign, escalação automática, ou notificação de SLA breach

### O que vamos construir

#### 1. Migration DB — Novos triggers de automação + tabela de automações helpdesk

- Adicionar novos valores ao enum `automation_trigger`: `ticket_created`, `ticket_status_changed`, `ticket_assigned`, `ticket_sla_warning`, `ticket_sla_breached`
- Criar tabela `helpdesk_automations` (separada do sistema genérico, focada em regras simples do helpdesk):
  - `id`, `workspace_id`, `name`, `trigger` (enum: `on_create`, `on_sla_warning`, `on_sla_breach`, `on_status_change`, `on_priority_change`)
  - `conditions` (JSONB — ex: `{"priority": "urgent", "department": "technical"}`)
  - `action_type` (enum: `auto_assign_round_robin`, `auto_assign_specific`, `escalate`, `change_priority`, `add_tag`, `send_notification`, `change_status`)
  - `action_config` (JSONB — ex: `{"assign_to": "uuid"}` ou `{"escalate_to": "uuid"}`)
  - `is_active`, `execution_count`, `last_executed_at`, `created_at`
- RLS com workspace_id scope

#### 2. Página SLA Policies (`/dashboard/helpdesk/sla-policies`)

Página dedicada e mais completa que a secção no TicketsSettings:
- **Tabela de regras SLA** por prioridade (urgente/alta/média/baixa) com campos editáveis inline:
  - 1ª Resposta (horas), Resolução (horas), Escalação após (horas), Escalar para (dropdown de agentes)
- **Indicadores visuais**: badge colorido por prioridade, ícones de alerta
- **Preview**: "Um ticket urgente deve ser respondido em 1h e resolvido em 4h"
- **Horário de trabalho**: Configuração de business hours (9h-18h, Seg-Sex) — campo informativo por agora, preparado para cálculo futuro
- Toggle ativar/desativar por regra

#### 3. Página Automações Helpdesk (`/dashboard/helpdesk/automations`)

Interface visual para criar regras de automação do helpdesk:
- **Lista de automações** com estado (ativa/inativa), trigger, ação, contador de execuções
- **Dialog de criação/edição** com 3 passos:
  1. **Trigger**: Quando? (Ticket criado, SLA em risco, SLA violado, Estado alterado, Prioridade alterada)
  2. **Condições** (opcional): Filtros (prioridade = urgente, departamento = técnico, canal = email)
  3. **Ação**: O que fazer? (Auto-assign round-robin, Assign agente específico, Escalar, Alterar prioridade, Adicionar tag, Notificar, Alterar estado)
- **Auto-assign round-robin**: Distribui tickets equitativamente entre agentes do workspace
- **Escalação automática**: Quando SLA < 25% do tempo restante, escalar para o agente definido na regra SLA
- Templates pré-definidos:
  - "Auto-atribuir tickets urgentes ao gestor"
  - "Escalar quando SLA em risco"
  - "Notificar equipa quando ticket criado via WhatsApp"

#### 4. Hook `useHelpdeskAutomations`

- CRUD para `helpdesk_automations`
- Query com filtros (trigger, is_active)
- Toggle ativar/desativar
- Estatísticas de execução

#### 5. Integração nas Rotas

- Adicionar rotas em `HelpdeskRoutes.tsx`:
  - `/dashboard/helpdesk/sla-policies` → `HelpdeskSLAPolicies`
  - `/dashboard/helpdesk/automations` → `HelpdeskAutomations`
- Atualizar `routeManifest.ts`:
  - `helpdesk-sla` → remover `isBeta: true`
  - Adicionar `helpdesk-automations` com ícone `Zap`

### Ficheiros

```text
NOVOS:
  supabase/migrations/...                              (migration: helpdesk_automations table)
  src/pages/dashboard/helpdesk/HelpdeskSLAPolicies.tsx (página SLA dedicada)
  src/pages/dashboard/helpdesk/HelpdeskAutomations.tsx (página automações)
  src/hooks/useHelpdeskAutomations.ts                  (CRUD automações)
  src/components/helpdesk/AutomationRuleDialog.tsx     (dialog criar/editar regra)

EDITADOS:
  src/routes/HelpdeskRoutes.tsx                        (2 novas rotas)
  src/config/routeManifest.ts                          (helpdesk-automations, unhide sla)
```

### Critérios de Aceitação
- Página SLA com tabela editável inline para 4 prioridades
- Página automações com lista + dialog de criação (3 passos)
- Pelo menos 5 tipos de ação disponíveis
- Round-robin lógica funcional (distribuição equitativa)
- Templates pré-definidos clicáveis
- Tudo em pt-PT, dark mode, responsive

