

# Módulo Helpdesk — Sistema de Tickets (Zoho-style)

## Visão Geral

Módulo completo de helpdesk interno para o backoffice, com dashboard de KPIs, gestão de tickets, atribuição de agentes, SLA com temporizador, departamentos e respostas rápidas (macros). Novo grupo de navegação "Suporte" na sidebar.

## Base de Dados

### Novas tabelas

**`support_tickets`** — tabela principal (separada de `client_tickets` que é do portal B2B)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| ticket_number | serial | Número sequencial #001 |
| subject | text | Assunto |
| description | text | Descrição inicial |
| status | enum | open, in_progress, waiting_client, waiting_internal, on_hold, resolved, closed |
| priority | enum | low, medium, high, urgent |
| type | enum | support, commercial, technical, billing, feature_request |
| channel | enum | email, phone, portal, chat, manual |
| department | text | Departamento (Suporte, Comercial, Técnico...) |
| assigned_to | uuid FK profiles | Agente atribuído |
| contact_id | uuid FK contacts | Contacto associado |
| company_id | uuid FK companies | Empresa associada |
| tags | text[] | Tags livres |
| sla_deadline | timestamptz | Deadline SLA |
| first_response_at | timestamptz | Timestamp 1ª resposta |
| resolved_at | timestamptz | |
| closed_at | timestamptz | |
| created_by | uuid FK profiles | Quem criou |
| created_at / updated_at | timestamptz | |

**`support_ticket_messages`** — thread de conversa

| Campo | Tipo |
|-------|------|
| id | uuid PK |
| ticket_id | uuid FK |
| sender_type | enum (agent, client, system) |
| sender_id | uuid |
| message | text |
| is_internal_note | boolean | Nota interna (invisível ao cliente) |
| attachments | jsonb |
| created_at | timestamptz |

**`support_canned_responses`** — respostas rápidas / macros

| Campo | Tipo |
|-------|------|
| id | uuid PK |
| workspace_id | uuid FK |
| title | text |
| content | text |
| category | text |
| shortcut | text | Ex: /saudacao |
| created_by | uuid |

RLS em todas as tabelas escopado por `workspace_id` + `auth.uid()` membership.

## Navegação

Novo grupo **"Suporte"** (order 8, entre Compras e Loja Online):

```text
Suporte (ícone: Headphones)
├── Dashboard Suporte     /dashboard/helpdesk
├── Tickets               /dashboard/helpdesk/tickets
├── Respostas Rápidas     /dashboard/helpdesk/canned-responses
```

Module-gated com `moduleSlug: "helpdesk"`. Reordenar grupos seguintes (+1).

## Páginas

### 1. Dashboard Suporte (`/dashboard/helpdesk`)
- **KPI Cards**: Tickets abertos, Tempo médio resposta, SLA compliance %, Resolvidos hoje
- **Gráfico**: Tickets por estado (donut) + Tickets criados nos últimos 7 dias (bar)
- **Lista rápida**: Top 5 tickets urgentes sem atribuição
- **Filtros globais**: Período, Departamento, Agente

### 2. Lista de Tickets (`/dashboard/helpdesk/tickets`)
- Tabela com colunas: #, Assunto, Contacto, Prioridade, Estado, Agente, SLA, Criado
- **Filtros**: Status, Prioridade, Tipo, Departamento, Agente, Tags
- **Pesquisa** por assunto/descrição
- **Ações em massa**: Atribuir agente, Mudar prioridade, Fechar
- **Botão "Novo Ticket"**: Dialog com formulário completo
- Indicador visual de SLA (verde/amarelo/vermelho)

### 3. Detalhe do Ticket (`/dashboard/helpdesk/tickets/:id`)
Layout split:
- **Coluna principal (70%)**: Thread de mensagens (estilo chat), campo de resposta com toolbar (anexos, nota interna, macro), ações de status
- **Sidebar direita (30%)**: Info do ticket (prioridade, tipo, departamento, tags editáveis), Contacto/Empresa linked, Agente atribuído (dropdown para mudar), SLA countdown timer, Histórico de alterações

### 4. Respostas Rápidas (`/dashboard/helpdesk/canned-responses`)
- CRUD de templates com título, conteúdo (rich text), categoria, atalho
- Pesquisa e filtro por categoria

## Funcionalidades de Agente

- **Atribuição**: Dropdown com membros do workspace, auto-assign por departamento (futuro)
- **SLA Timer**: Countdown visual com cores (verde > 50%, amarelo 20-50%, vermelho < 20%, badge "Expirado")
- **Canned Responses**: Botão no editor de resposta que abre popover com lista pesquisável, insere texto
- **Notas Internas**: Toggle no editor para marcar mensagem como interna (fundo diferente, não visível no portal)
- **Departamentos**: Filtro pré-definido (Suporte, Comercial, Técnico) — configurável no workspace

## Ficheiros

| Ficheiro | Ação |
|----------|------|
| Migração SQL | Criar 3 tabelas + enums + RLS |
| `src/config/routeManifest.ts` | Adicionar grupo "suporte" + 3 rotas |
| `src/hooks/useHelpdeskTickets.ts` | Hook CRUD com filtros, paginação |
| `src/hooks/useHelpdeskCannedResponses.ts` | Hook CRUD macros |
| `src/pages/dashboard/helpdesk/HelpdeskDashboard.tsx` | Dashboard KPIs |
| `src/pages/dashboard/helpdesk/HelpdeskTicketsList.tsx` | Lista filtrada |
| `src/pages/dashboard/helpdesk/HelpdeskTicketDetail.tsx` | Detalhe split |
| `src/pages/dashboard/helpdesk/HelpdeskCannedResponses.tsx` | Gestão macros |
| `src/components/helpdesk/TicketMessageThread.tsx` | Thread mensagens |
| `src/components/helpdesk/TicketSidebar.tsx` | Sidebar info |
| `src/components/helpdesk/SLATimer.tsx` | Componente countdown |
| `src/components/helpdesk/CannedResponsePicker.tsx` | Popover macros |
| `src/components/helpdesk/CreateTicketDialog.tsx` | Formulário criação |
| `src/routes/HelpdeskRoutes.tsx` | Rotas do módulo |
| `src/config/moduleNavRegistry.ts` | Entrada helpdesk |

