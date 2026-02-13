

## FastCRM Conversation AI 3.0 — GHL-Parity Upgrade

### Resumo

Implementar capacidades de Conversation AI ao nivel do LeadConnector/GHL no FastCRM, reutilizando a arquitetura existente (ai_agents, ai_personas, knowledge_bases, flow-engine, autopilot) e adicionando Multi-KB por bot, Response Info auditing, human handover, bot transfer, workflow triggers por IA, multi-calendar booking, auto follow-up engine, session summary/transcript, e guided setup wizard.

### Rollout em 3 Fases

- **Fase 1**: Multi-KB + Response Info + Summary/Transcript
- **Fase 2**: Human Handover + Workflow Triggers + Transfer Bot
- **Fase 3**: Multi-Calendar Booking + Auto Follow-up + Guided Wizard

---

### 1. Data Model (Migrations SQL)

**1.1 `bot_knowledge_bases` (Nova)**

Tabela de associacao Many-to-Many entre ai_agents e knowledge_bases, com prioridade e limites:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| bot_id | UUID NOT NULL -> ai_agents(id) |
| knowledge_base_id | UUID NOT NULL -> knowledge_bases(id) |
| priority | INT DEFAULT 0 |
| created_at | TIMESTAMPTZ DEFAULT now() |

Constraint: UNIQUE(bot_id, knowledge_base_id). Limite de 7 KBs por bot enforced via trigger de validacao (nao CHECK).

Nota: Substitui o campo `knowledge_base_ids UUID[]` existente em `ai_agents` (mantido por retrocompatibilidade, mas a nova tabela e a fonte primaria).

**1.2 `ai_message_audit` (Nova)**

Auditoria detalhada de cada resposta AI gerada:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| message_id | UUID NULL |
| conversation_id | UUID NOT NULL |
| bot_id | UUID NULL -> ai_agents(id) |
| prompt_used | TEXT |
| rag_chunks | JSONB (array de {chunk_id, source, score, excerpt}) |
| intent | JSONB ({label, confidence}) |
| model_meta | JSONB ({model, tokens, latency_ms}) |
| created_at | TIMESTAMPTZ DEFAULT now() |

**1.3 `conversation_ai_state` (Nova)**

Estado do bot por conversa:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| conversation_id | UUID NOT NULL UNIQUE |
| active_bot_id | UUID NULL -> ai_agents(id) |
| is_bot_sleeping | BOOLEAN DEFAULT false |
| sleep_until | TIMESTAMPTZ NULL |
| fail_count | INT DEFAULT 0 |
| last_ai_message_at | TIMESTAMPTZ NULL |
| handed_over | BOOLEAN DEFAULT false |
| handed_over_to_user_id | UUID NULL |
| updated_at | TIMESTAMPTZ DEFAULT now() |

**1.4 `ai_workflow_triggers` (Nova)**

Associacao bot -> workflow com condicao textual:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| bot_id | UUID NOT NULL -> ai_agents(id) |
| workflow_id | UUID NOT NULL |
| action_name | TEXT NOT NULL |
| trigger_condition_text | TEXT NOT NULL |
| examples | TEXT[] NULL |
| is_active | BOOLEAN DEFAULT true |

**1.5 `bot_transfer_rules` (Nova)**

Regras de transferencia entre bots:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| from_bot_id | UUID NOT NULL -> ai_agents(id) |
| to_bot_id | UUID NOT NULL -> ai_agents(id) |
| trigger_condition_text | TEXT NOT NULL |
| examples | TEXT[] NULL |
| is_active | BOOLEAN DEFAULT true |

**1.6 `ai_booking_calendars` (Nova)**

Calendarios associados a bots para agendamento:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| bot_id | UUID NOT NULL -> ai_agents(id) |
| calendar_id | UUID NOT NULL |
| calendar_name | TEXT NOT NULL |
| description | TEXT NULL |
| keywords | TEXT[] DEFAULT '{}' |
| is_fallback | BOOLEAN DEFAULT false |
| allow_cancel | BOOLEAN DEFAULT false |
| post_booking_actions | JSONB DEFAULT '{}' |

**1.7 `ai_followup_policies` (Nova)**

Politica de follow-up automatico por bot/canal:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| bot_id | UUID NOT NULL -> ai_agents(id) |
| channel | TEXT NOT NULL |
| scenarios | JSONB (stopped_replying, busy, requested_time) |
| cadence | JSONB (delays em minutos) |
| working_hours | JSONB ({tz, windows}) |
| allow_channel_switching | BOOLEAN DEFAULT false |
| switch_rules | JSONB NULL |

**1.8 `followup_queue` (Nova)**

Fila de follow-ups agendados:

| Campo | Tipo |
|---|---|
| id | UUID PK |
| workspace_id | UUID NOT NULL |
| conversation_id | UUID NOT NULL |
| policy_id | UUID NOT NULL -> ai_followup_policies(id) |
| next_run_at | TIMESTAMPTZ NOT NULL |
| step_index | INT DEFAULT 0 |
| status | TEXT DEFAULT 'pending' (pending, running, completed, cancelled) |
| created_at | TIMESTAMPTZ DEFAULT now() |

**1.9 Atualizar `conversation_sessions`**

Adicionar colunas a tabela existente:

```text
summary TEXT NULL
transcript TEXT NULL
saved_to_contact_field TEXT NULL
inactivity_threshold_minutes INT DEFAULT 30
session_end_at TIMESTAMPTZ NULL
```

**1.10 Adicionar `goal_config` a `ai_agents`**

```text
goal_config JSONB DEFAULT '{}'
```

**RLS**: Todas as novas tabelas seguem o padrao workspace isolation existente (SELECT para members, INSERT/UPDATE/DELETE para admin/owner + super_admin).

---

### 2. Edge Functions

**Fase 1:**

**2.1 Atualizar `ai-inbox-reply` (bot-run)**

Alteracoes ao runtime principal do autopilot:
- Carregar KBs do bot via `bot_knowledge_bases` (JOIN por prioridade, max 7)
- Apos gerar resposta, persistir `ai_message_audit` (prompt, RAG chunks, intent, modelo, latencia)
- Atualizar `conversation_ai_state` (last_ai_message_at, fail_count)
- Retornar audit_id no response para o frontend mostrar Response Info

**2.2 Atualizar `conversation-summary`**

Adicionar modo "session summary":
- Input: conversation_id + inactivity_threshold
- Gerar summary + transcript completo
- Guardar em `conversation_sessions`
- Opcionalmente guardar summary num campo do contacto/lead
- Trigger workflow se configurado (via `workflow-trigger`)

**Fase 2:**

**2.3 `human-handover` (Nova)**

Input: workspace_id, conversation_id, reason (contact_request | lack_of_info | max_retries)

Logica:
1. Atualizar `conversation_ai_state`: handed_over=true, is_bot_sleeping=true
2. Atribuir conversa a utilizador (se configurado em goal_config)
3. Criar task com due date +24h
4. Enviar mensagem de encerramento configurable
5. Aplicar tag `human_handover` ao lead/contacto
6. Log em `autopilot_events`

Integrado no autopilot: se `fail_count >= max_retries` (default 2), dispara handover automatico.

**2.4 `bot-transfer` (Nova)**

Input: workspace_id, conversation_id, from_bot_id

Logica:
1. Avaliar `bot_transfer_rules` (AI classifica intent vs trigger_condition_text)
2. Se match: atualizar `conversation_ai_state.active_bot_id` para to_bot_id
3. Log em `autopilot_events`

**2.5 `workflow-trigger-from-ai` (Nova)**

Input: workspace_id, conversation_id, bot_id, detected_intent

Logica:
1. Buscar `ai_workflow_triggers` activos para o bot
2. AI compara intent com trigger_condition_text + examples
3. Se match com confianca > 0.7: chamar `workflow-trigger` existente
4. Safety: nao disparar outro bot via workflow (flag no input_data)

**Fase 3:**

**2.6 `booking-router` (Nova)**

Input: workspace_id, bot_id, user_message, conversation_id

Logica:
1. Buscar `ai_booking_calendars` do bot
2. AI classifica pedido vs calendar name/description/keywords
3. Se match: retornar calendar_id + config
4. Se nenhum match: usar fallback calendar
5. Apos booking: pausa bot, trigger workflow, opcionalmente transfer bot

**2.7 `auto-followup-scheduler` (Nova)**

Input: workspace_id (cron job ou event-driven)

Logica:
1. Buscar `followup_queue` WHERE next_run_at <= now() AND status = 'pending'
2. Para cada item:
   - Verificar working_hours da policy
   - Verificar se contacto ja respondeu (cancelar se sim)
   - Gerar mensagem follow-up via ai-inbox-reply
   - Enviar via canal (ou canal alternativo se allow_channel_switching)
   - Incrementar step_index, calcular proximo next_run_at da cadence
   - Se ultimo step: marcar completed

**2.8 `conversation-summary-generator` (Nova)**

Dispara automaticamente:
- Apos inactivity_threshold_minutes sem mensagens
- Imediatamente apos handover ou bot sleep
- Apos mensagem outbound manual (humano)

Gera summary + transcript, guarda em conversation_sessions, trigger workflow com variaveis summary/transcript.

---

### 3. UI/UX Components

**Fase 1:**

**3.1 Response Info no Inbox**

- Adicionar icone "info" nos `MessageBubble` de mensagens outbound com audit_id
- Ao clicar: popover/sheet mostrando:
  - Nome do bot/agente
  - Prompt usado (colapsavel)
  - Knowledge chunks usados (fonte + score + excerpt)
  - Intent detectado + confianca
  - Modelo + tokens + latencia
- Componente: `ResponseInfoSheet.tsx`

**3.2 Multi-KB Assignment no Agent Form**

- Atualizar `AIAgentForm.tsx`:
  - Substituir multi-select de KBs por lista com drag-and-drop para prioridade
  - Indicador visual "7/7 KBs maximo"
  - Persistir via `bot_knowledge_bases` em vez de `knowledge_base_ids` array

**3.3 Conversation Summary Panel**

- No `InboxContextPanel.tsx` adicionar tab "Resumo" mostrando:
  - Summary gerado automaticamente
  - Transcript colapsavel
  - Botao "Regenerar resumo"

**Fase 2:**

**3.4 Bot Management Dashboard**

- Nova seccao em cada agent card (`AIAgentCard.tsx`):
  - Status: activo/inactivo + handover count
  - Quick actions: Sleep bot, Wake bot
- `AgentGoalsPanel.tsx` (Novo):
  - Tabs: Handover | Workflows | Transfer | Follow-up | Booking
  - Cada tab com formulario de configuracao

**3.5 Handover Rules Config**

- No AgentGoalsPanel, tab "Handover":
  - Max retries antes de handover (slider, default 2)
  - Mensagem de encerramento (textarea)
  - Atribuir a utilizador especifico (dropdown)
  - Tag a aplicar (input)

**3.6 Workflow Triggers Config**

- Tab "Workflows":
  - Lista de triggers: workflow + condicao + exemplos
  - Botao "Adicionar trigger"
  - Select de workflows publicados

**3.7 Transfer Bot Rules**

- Tab "Transferencia":
  - Lista de regras: bot destino + condicao + exemplos
  - Select de outros bots do workspace

**Fase 3:**

**3.8 Multi-Calendar Booking Config**

- Tab "Agendamento":
  - Lista de calendarios associados
  - Keywords para matching
  - Fallback calendar toggle
  - Acoes pos-booking (workflow, transfer, pausa)

**3.9 Follow-up Policy Config**

- Tab "Follow-up":
  - Cenarios (stopped_replying, busy, requested_time)
  - Cadence: lista de delays em minutos
  - Working hours config (reutilizar componente existente)
  - Channel switching toggle + regras

**3.10 Guided Setup Wizard**

- Nova rota: `/dashboard/ai-assistants/wizard`
- Componente: `BotSetupWizard.tsx`
- Steps:
  1. Info basica (nome, canal, persona)
  2. Knowledge Bases (selecionar ate 7)
  3. Objectivos (handover rules, booking, follow-up)
  4. Workflows + Transfer rules
  5. Revisao + Activar

---

### 4. Analytics

- Handover rate: `ai_message_audit` + `conversation_ai_state` WHERE handed_over = true
- Bot fail-to-resolve: fail_count >= threshold / total conversations
- Follow-up effectiveness: join followup_queue -> message_length_events (opportunity_created, deal_won)
- Booking success: ai_booking_calendars usage vs fallback rate

Integrado no dashboard de AI Assistants existente.

---

### Ficheiros Afetados

| Ficheiro | Fase | Alteracao |
|---|---|---|
| Migracao SQL | 1 | 9 tabelas novas + colunas adicionais |
| `supabase/functions/ai-inbox-reply/index.ts` | 1 | Multi-KB via bot_knowledge_bases + audit persist |
| `supabase/functions/conversation-summary/index.ts` | 1 | Session summary mode + transcript + workflow trigger |
| `src/components/inbox/MessageBubble.tsx` | 1 | Response Info icon |
| `src/components/inbox/ResponseInfoSheet.tsx` | 1 | Novo - audit detail popover |
| `src/components/ai-agents/AIAgentForm.tsx` | 1 | Multi-KB priority list |
| `src/components/inbox/InboxContextPanel.tsx` | 1 | Summary tab |
| `src/hooks/useAIMessageAudit.ts` | 1 | Novo - query ai_message_audit |
| `supabase/functions/human-handover/index.ts` | 2 | Novo |
| `supabase/functions/bot-transfer/index.ts` | 2 | Novo |
| `supabase/functions/workflow-trigger-from-ai/index.ts` | 2 | Novo |
| `supabase/functions/ghl-webhook-message/index.ts` | 2 | Integrar handover + state checks |
| `src/components/ai-agents/AgentGoalsPanel.tsx` | 2 | Novo - tabs config |
| `src/components/ai-agents/AIAgentCard.tsx` | 2 | Status + quick actions |
| `supabase/functions/booking-router/index.ts` | 3 | Novo |
| `supabase/functions/auto-followup-scheduler/index.ts` | 3 | Novo |
| `supabase/functions/conversation-summary-generator/index.ts` | 3 | Novo |
| `src/components/ai-agents/BotSetupWizard.tsx` | 3 | Novo - guided wizard |

### Ordem de Implementacao

**Fase 1** (esta implementacao):
1. Migracao DB: bot_knowledge_bases + ai_message_audit + conversation_ai_state + conversation_sessions updates + goal_config em ai_agents
2. Edge: Atualizar ai-inbox-reply (multi-KB + audit)
3. Edge: Atualizar conversation-summary (session mode)
4. Hook: useAIMessageAudit
5. UI: ResponseInfoSheet + MessageBubble icon
6. UI: AIAgentForm multi-KB
7. UI: InboxContextPanel summary tab

**Fase 2** (proxima iteracao):
8. Migracao DB: ai_workflow_triggers + bot_transfer_rules
9. Edge: human-handover + bot-transfer + workflow-trigger-from-ai
10. UI: AgentGoalsPanel (handover + workflows + transfer tabs)

**Fase 3** (iteracao final):
11. Migracao DB: ai_booking_calendars + ai_followup_policies + followup_queue
12. Edge: booking-router + auto-followup-scheduler + conversation-summary-generator
13. UI: Booking + Follow-up tabs + BotSetupWizard

