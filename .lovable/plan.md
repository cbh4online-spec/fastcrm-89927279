

## Fase 3 — Multi-Calendar Booking + Auto Follow-up + Guided Wizard

### Resumo

Criar 3 novas tabelas (ai_booking_calendars, ai_followup_policies, followup_queue), 3 novas edge functions (booking-router, auto-followup-scheduler, conversation-summary-generator), expandir o AgentGoalsPanel com 2 tabs adicionais (Agendamento + Follow-up), e criar o BotSetupWizard como guided setup de 5 passos.

---

### 1. Migracao DB

**1.1 `ai_booking_calendars`**

| Campo | Tipo |
|---|---|
| id | UUID PK DEFAULT gen_random_uuid() |
| workspace_id | UUID NOT NULL |
| bot_id | UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE |
| calendar_id | UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE |
| calendar_name | TEXT NOT NULL |
| description | TEXT NULL |
| keywords | TEXT[] DEFAULT '{}' |
| is_fallback | BOOLEAN DEFAULT false |
| allow_cancel | BOOLEAN DEFAULT false |
| post_booking_actions | JSONB DEFAULT '{}' |
| created_at | TIMESTAMPTZ DEFAULT now() |

RLS: workspace isolation via workspace_members.

**1.2 `ai_followup_policies`**

| Campo | Tipo |
|---|---|
| id | UUID PK DEFAULT gen_random_uuid() |
| workspace_id | UUID NOT NULL |
| bot_id | UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE |
| channel | TEXT NOT NULL |
| scenarios | JSONB DEFAULT '{}' |
| cadence | JSONB DEFAULT '{"delays_minutes": [60, 360, 1440]}' |
| working_hours | JSONB DEFAULT '{}' |
| allow_channel_switching | BOOLEAN DEFAULT false |
| switch_rules | JSONB NULL |
| is_active | BOOLEAN DEFAULT true |
| created_at | TIMESTAMPTZ DEFAULT now() |

RLS: workspace isolation.

**1.3 `followup_queue`**

| Campo | Tipo |
|---|---|
| id | UUID PK DEFAULT gen_random_uuid() |
| workspace_id | UUID NOT NULL |
| conversation_id | UUID NOT NULL |
| policy_id | UUID NOT NULL REFERENCES ai_followup_policies(id) ON DELETE CASCADE |
| bot_id | UUID NOT NULL |
| next_run_at | TIMESTAMPTZ NOT NULL |
| step_index | INT DEFAULT 0 |
| status | TEXT DEFAULT 'pending' |
| created_at | TIMESTAMPTZ DEFAULT now() |

RLS: workspace isolation. Index em (status, next_run_at) para queries eficientes do scheduler.

---

### 2. Edge Functions

**2.1 `booking-router` (Nova)**

Input: workspace_id, bot_id, user_message, conversation_id

Logica:
1. Buscar `ai_booking_calendars` do bot
2. Usar AI (Gemini flash) para classificar user_message contra calendar_name/description/keywords
3. Se match: retornar calendar_id + config
4. Se nenhum match: usar calendar com is_fallback=true
5. Retornar tambem post_booking_actions e allow_cancel

Output: { matched: true, calendar_id, calendar_name, post_booking_actions, allow_cancel } ou { matched: false, fallback_calendar_id }

**2.2 `auto-followup-scheduler` (Nova)**

Input: workspace_id (event-driven ou manual trigger)

Logica:
1. Buscar `followup_queue` WHERE next_run_at <= now() AND status = 'pending'
2. Para cada item:
   - Buscar policy de `ai_followup_policies`
   - Verificar working_hours (timezone + janelas horárias): se fora, adiar next_run_at para proximo slot
   - Verificar se contacto ja respondeu na conversa (query mensagens inbound recentes): se sim, marcar cancelled
   - Gerar mensagem follow-up via chamada interna ao ai-inbox-reply
   - Enviar via canal (ou canal alternativo se allow_channel_switching + switch_rules match)
   - Incrementar step_index, calcular proximo next_run_at a partir de cadence.delays_minutes
   - Se ultimo step da cadence: marcar completed
3. Log em autopilot_events

Output: { processed: N, cancelled: M, deferred: K }

**2.3 `conversation-summary-generator` (Nova)**

Dispara automaticamente via triggers contextuais (handover, bot sleep, inactividade).

Input: workspace_id, conversation_id, trigger_reason (inactivity | handover | manual_outbound)

Logica:
1. Buscar mensagens da conversa
2. Gerar summary + transcript via AI
3. Upsert em conversation_sessions (summary, transcript, session_end_at)
4. Opcionalmente guardar summary num campo do contacto/lead (saved_to_contact_field)
5. Se workflow configurado, chamar workflow-trigger

Output: { session_id, summary, transcript_length }

---

### 3. Hooks Frontend

**3.1 `useAgentBooking` (Novo)**

- `useBookingCalendars(botId)`: query ai_booking_calendars
- `useCreateBookingCalendar()`: mutation insert
- `useDeleteBookingCalendar()`: mutation delete
- `useUpdateBookingCalendar()`: mutation update

**3.2 `useAgentFollowup` (Novo)**

- `useFollowupPolicies(botId)`: query ai_followup_policies
- `useCreateFollowupPolicy()`: mutation insert
- `useUpdateFollowupPolicy()`: mutation update
- `useDeleteFollowupPolicy()`: mutation delete
- `useFollowupQueue(conversationId)`: query followup_queue para visibilidade no inbox

---

### 4. UI Components

**4.1 Expandir `AgentGoalsPanel.tsx`**

Adicionar 2 tabs ao grid existente (de 3 para 5):

- Tab "Agendamento" (CalendarBooking):
  - Lista de calendarios associados ao bot (do workspace, via useCalendars)
  - Para cada: nome, descricao, keywords (input tags), fallback toggle
  - Acoes pos-booking: pausa bot (checkbox), trigger workflow (select), transfer bot (select)
  - Botao "Adicionar Calendário" com select dos calendarios disponíveis

- Tab "Follow-up":
  - Canal principal (select: whatsapp, email, sms)
  - Cenarios ativos (checkboxes: stopped_replying, busy, requested_time)
  - Cadence: lista editavel de delays em minutos (ex: 60, 360, 1440)
  - Working hours: timezone select + janelas horarias (reutilizar pattern existente)
  - Channel switching: toggle + regras (ex: "se sem resposta 24h em instagram, enviar sms")
  - Toggle is_active

**4.2 `BotSetupWizard.tsx` (Novo)**

Componente wizard de 5 passos para criar um agente completo:

Step 1 — Info basica:
- Nome do agente
- Canal (select de AGENT_CHANNELS)
- Persona (select das personas existentes)
- Descricao (textarea)

Step 2 — Knowledge Bases:
- Lista de KBs do workspace
- Selecionar ate 7 com prioridade (drag ou setas)
- Indicador "X/7"

Step 3 — Objectivos:
- Handover: toggle + max retries + mensagem encerramento
- Booking: toggle + selecionar calendarios
- Follow-up: toggle + cadence basica

Step 4 — Automacoes:
- Workflow triggers: adicionar triggers simples
- Transfer rules: adicionar regras
- (formularios simplificados vs AgentGoalsPanel completo)

Step 5 — Revisao:
- Resumo visual de toda a configuracao
- Botao "Criar & Ativar" / "Criar Inativo"

Rota: Nova tab "Wizard" no AIAssistantsModule OU botao "Criar com Assistente" na AgentsTab.

**4.3 Atualizar `AgentCardExpanded.tsx`**

- Adicionar badges visuais para booking calendars count e followup policy status
- Ex: "3 calendarios", "Follow-up ativo"

---

### 5. Seguranca

- RLS em todas as 3 novas tabelas: SELECT/INSERT/UPDATE/DELETE onde workspace_id pertence ao utilizador via workspace_members
- Edge functions: verify_jwt = false (consistente com existentes)
- booking-router: valida que o bot pertence ao workspace
- auto-followup-scheduler: usa service role key, valida workspace isolation

---

### Ficheiros Afetados

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | 3 tabelas novas + indexes + RLS |
| `supabase/functions/booking-router/index.ts` | Nova |
| `supabase/functions/auto-followup-scheduler/index.ts` | Nova |
| `supabase/functions/conversation-summary-generator/index.ts` | Nova |
| `supabase/config.toml` | 3 novas funcoes |
| `src/hooks/useAgentBooking.ts` | Novo |
| `src/hooks/useAgentFollowup.ts` | Novo |
| `src/hooks/useAgentGoals.ts` | Adicionar tipos Booking + Followup |
| `src/components/ai-agents/AgentGoalsPanel.tsx` | 2 novas tabs (Agendamento + Follow-up) |
| `src/components/ai-agents/BotSetupWizard.tsx` | Novo — wizard 5 steps |
| `src/components/ai-assistants/AgentCardExpanded.tsx` | Badges booking + followup |
| `src/components/ai-assistants/AgentsTab.tsx` | Botao "Criar com Assistente" -> wizard |
| `src/integrations/supabase/types.ts` | Auto-updated |

### Ordem de Implementacao

1. Migracao DB (3 tabelas + RLS + indexes)
2. Edge functions: booking-router, auto-followup-scheduler, conversation-summary-generator
3. config.toml (3 novas funcoes)
4. Deploy edge functions
5. Hooks: useAgentBooking + useAgentFollowup
6. UI: AgentGoalsPanel (2 tabs novas)
7. UI: AgentCardExpanded (badges)
8. UI: BotSetupWizard (wizard completo)
9. UI: AgentsTab (botao wizard)

