

## Diagnóstico

Existem **dois sistemas de tickets paralelos** na plataforma:

| Sistema | Tabelas | Hooks | Páginas |
|---------|---------|-------|---------|
| **Admin Helpdesk** | `support_tickets`, `support_ticket_messages`, `support_canned_responses`, `support_ticket_history` | `useHelpdeskTickets`, `useHelpdeskCannedResponses`, `useHelpdeskHistory` | `/dashboard/helpdesk/*` (4 páginas + 14 componentes) |
| **Client Portal** | `client_tickets`, `client_ticket_messages` | `useClientTickets`, `useTicketMessages` | `/client/support`, `/client/support/:id` (2 páginas básicas) |

### Problema
A tabela `client_tickets` é minimalista — sem `ticket_number`, `assigned_to`, `tags`, `source`, `first_response_at`, `satisfaction_rating`, `sla_breached`. A UI do portal é funcional mas básica. O admin não tem forma de gerir `client_tickets` (só vê `support_tickets`).

O pedido quer enriquecer o sistema `client_tickets` com funcionalidade de nível Zoho Desk. Dado o volume (~40 ficheiros), proponho 3 fases de implementação.

---

## Fase 1 — DB + Hooks (fundação)

### 1a. Migration: Enriquecer `client_tickets`
```sql
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'portal';
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER;
ALTER TABLE client_tickets ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT;
```

### 1b. Migration: Enriquecer `client_ticket_messages`
```sql
ALTER TABLE client_ticket_messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE client_ticket_messages ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text';
ALTER TABLE client_ticket_messages ADD COLUMN IF NOT EXISTS is_internal_note BOOLEAN DEFAULT false;
```

### 1c. Migration: Criar `ticket_sla_rules`
Tabela nova com `workspace_id`, `priority`, `first_response_hours`, `resolution_hours`, `escalation_after_hours`, `escalate_to`, `is_active`.

### 1d. Migration: Criar `ticket_canned_responses`
Tabela nova (separada de `support_canned_responses` que é do Helpdesk interno).

### 1e. Auto-generate `ticket_number`
Trigger para gerar `TK-00001` sequencial por workspace na inserção.

### 1f. Auto-calculate `sla_deadline`
Trigger que calcula `sla_deadline` com base em `ticket_sla_rules` para a prioridade do ticket.

### 1g. Indexes + RLS
Indexes nos campos filtráveis. RLS em todas as tabelas novas com `workspace_id` scope.

### 1h. Hooks (8 hooks)
- `useClientTicketsAdmin` — Lista com filtros avançados para o CRM admin (query `client_tickets` com workspace_id)
- `useClientTicketDetail` — Single ticket com mensagens
- `useCreateClientTicket` — Criar ticket com auto ticket_number e SLA
- `useUpdateClientTicket` — Update status, priority, assignment, tags
- `useCreateTicketMessage` — Mensagem (client/agent/internal note)
- `useTicketSLARules` — CRUD para regras SLA
- `useTicketCannedResponses` — CRUD para respostas pré-definidas
- `useClientTicketStats` — KPIs: open count, FRT, MTTR, SLA breach rate, satisfaction avg

Realtime: subscrição em `client_ticket_messages` para mensagens instantâneas.

---

## Fase 2 — Admin Pages (CRM Side)

### 2a. Ticket List (`/dashboard/tickets`)
- `@tanstack/react-table` com `DataTable` existente
- Colunas: ticket_number, subject, client, type, priority, status, agent, SLA countdown, created_at
- Toggle tabela/kanban (reutilizar padrão do Helpdesk com `@dnd-kit`)
- Bulk actions: assign, status, priority, tag
- Filtros com URL sync (`nuqs`), pesquisa fuzzy (`fuse.js` + `use-debounce`)
- Skeleton loaders

### 2b. Ticket Detail (`/dashboard/tickets/:id`)
- Layout 70/30 (conversação + sidebar)
- Tabs: Conversação | Atividade | Relacionados
- Mensagens com markdown rendering, `react-timeago`, avatars
- Internal notes (fundo amarelo, visíveis só para agentes)
- Reply composer com TipTap (reutilizar `RichTextEditor` existente), toggle resposta/nota interna
- Canned responses picker, botão "Sugerir IA" (placeholder)
- Sidebar: status, priority, agent dropdown, tags editor, SLA timer, client info card, CSAT

### 2c. Ticket Dashboard (`/dashboard/tickets/dashboard`)
- 5 KPIs com `react-countup`
- Gráficos `recharts`: tendência 30d, volume por tipo, distribuição por prioridade
- Skeleton loaders

### 2d. SLA Settings (`/dashboard/tickets/settings`)
- Tabela editável de regras SLA por prioridade
- Gestão de canned responses

---

## Fase 3 — Client Portal Enhancement

### 3a. Client Ticket List (`/client/support`)
- Melhorar com ticket_number, `react-timeago`, badges coloridos, filtro por status
- Formulário de criação com TipTap e `react-dropzone`

### 3b. Client Ticket Detail (`/client/support/:id`)
- Conversação com markdown rendering e anexos
- SEM notas internas, SEM assignment, SEM SLA
- CSAT rating (1-5 estrelas) quando resolvido
- Botão "Marcar como resolvido"

### 3c. Edge Function: `ai-ticket-suggest-reply`
- Placeholder que retorna "Funcionalidade IA em desenvolvimento"
- Estrutura preparada para Anthropic

---

## Ficheiros Criados/Modificados

```text
FASE 1 (DB + Hooks):
  supabase/migrations/...                           (migration)
  src/hooks/tickets/useClientTicketsAdmin.ts         (NOVO)
  src/hooks/tickets/useClientTicketDetail.ts         (NOVO)
  src/hooks/tickets/useCreateClientTicket.ts         (NOVO)
  src/hooks/tickets/useUpdateClientTicket.ts         (NOVO)
  src/hooks/tickets/useCreateTicketMessage.ts        (NOVO)
  src/hooks/tickets/useTicketSLARules.ts             (NOVO)
  src/hooks/tickets/useTicketCannedResponses.ts      (NOVO)
  src/hooks/tickets/useClientTicketStats.ts          (NOVO)

FASE 2 (Admin):
  src/pages/dashboard/tickets/TicketsList.tsx         (NOVO)
  src/pages/dashboard/tickets/TicketDetail.tsx        (NOVO)
  src/pages/dashboard/tickets/TicketsDashboard.tsx    (NOVO)
  src/pages/dashboard/tickets/TicketsSettings.tsx     (NOVO)
  src/components/tickets/TicketKanban.tsx              (NOVO)
  src/components/tickets/TicketBulkBar.tsx             (NOVO)
  src/components/tickets/TicketConversation.tsx        (NOVO)
  src/components/tickets/TicketDetailSidebar.tsx       (NOVO)
  src/components/tickets/TicketCSATStars.tsx            (NOVO)
  src/routes/TicketsRoutes.tsx                         (NOVO)
  src/config/routeManifest.ts                          (EDIT — add tickets routes)

FASE 3 (Client Portal):
  src/pages/client/ClientSupportPage.tsx              (EDIT — enrich)
  src/pages/client/ClientTicketDetailPage.tsx          (EDIT — enrich)
  src/hooks/client-portal/useClientTickets.ts          (EDIT — adapt to new columns)
  supabase/functions/ai-ticket-suggest-reply/index.ts  (NOVO)
```

## Implementação

Dada a dimensão, vou implementar **Fase 1 + Fase 2** neste ciclo (DB, hooks, todas as páginas admin). A Fase 3 (client portal enhancement + edge function) fica para o ciclo seguinte.

## Critérios de Aceitação
- 4 novas tabelas/alterações com RLS e triggers
- 8 hooks TanStack Query com cache invalidation
- Dashboard admin com 5+ KPIs e gráficos
- Lista com tabela/kanban, bulk actions, filtros URL
- Detalhe com thread, sidebar, notas internas
- SLA configurável por prioridade
- Realtime em mensagens
- Texto em pt-PT, dark mode, responsive

