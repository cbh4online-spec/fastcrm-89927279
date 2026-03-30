

## Diagnóstico

O módulo Helpdesk atual é funcional mas minimalista comparado com Zoho Desk/Freshdesk. Tem apenas:

- **4 páginas**: Dashboard, Lista de Tickets, Detalhe de Ticket, Respostas Rápidas
- **5 componentes**: CreateTicketDialog, TicketMessageThread, TicketSidebar, SLATimer, CannedResponsePicker
- **3 tabelas DB**: support_tickets, support_ticket_messages, support_canned_responses

**Funcionalidades em falta** (benchmark Zoho Desk/Freshdesk):

| Categoria | Zoho/Freshdesk | FastCRM Atual |
|-----------|---------------|---------------|
| Vistas (Kanban, Meus, Por Equipas) | ✅ | ❌ Só tabela |
| Atribuição a agentes com avatar | ✅ | ❌ Só UUID |
| Satisfação do cliente (CSAT) | ✅ | ❌ |
| Base de Conhecimento | ✅ | ❌ |
| Políticas SLA configuráveis | ✅ | ❌ Hardcoded 24h |
| Automações (auto-assign, escalação) | ✅ | ❌ |
| Métricas avançadas (MTTR, FRT, CSAT) | ✅ | ❌ Básico |
| Merge/link tickets | ✅ | ❌ |
| Histórico de alterações (audit log) | ✅ | ❌ |
| Anexos em mensagens | ✅ | ❌ Schema existe, UI não |
| Tags editáveis no detalhe | ✅ | ❌ Read-only |
| Contacto/Empresa linkados | ✅ | ❌ IDs sem UI |
| Tabs no detalhe (Atividade, Relacionados) | ✅ | ❌ |
| Bulk actions na lista | ✅ | ❌ |
| Realtime updates | ✅ | ❌ |

---

## Plano de Implementação — 5 Fases

### Fase 1 — Enriquecimento do Dashboard e Lista (UI imediata)

**Dashboard (`HelpdeskDashboard.tsx`)**:
- Adicionar KPIs: Tempo Médio de Resposta (FRT), Tempo Médio de Resolução (MTTR), tickets por canal (donut chart)
- Gráfico de tendência semanal (tickets abertos vs resolvidos)
- Tabela "Tickets Recentes" com acesso rápido
- Cards de agentes com carga de trabalho (tickets atribuídos por agente)

**Lista (`HelpdeskTicketsList.tsx`)**:
- Vista Kanban por estado (drag & drop entre colunas com `@dnd-kit`)
- Toggle tabela/kanban
- Bulk actions: atribuir agente, alterar prioridade, fechar em massa
- Filtro por agente, canal, tags, datas
- Checkbox multi-selecção na tabela
- Coluna "Agente" com avatar e nome (join com profiles)

### Fase 2 — Detalhe de Ticket Profissional

**Ticket Detail (`HelpdeskTicketDetail.tsx`)**:
- Tabs: Conversação | Atividade/Histórico | Relacionados
- Timeline de alterações (audit log visual)
- Upload de anexos nas mensagens (storage bucket)
- Editor de tags inline (adicionar/remover)
- Contacto/Empresa linkados com card visual e link rápido
- Botão "Merge Ticket" com selecção de ticket destino
- Botão "Ticket Relacionado" para linkar tickets
- Rich text no composer (negrito, listas, links)

**Sidebar (`TicketSidebar.tsx`)**:
- Atribuição de agente com dropdown de membros do workspace
- Campo "Observadores" (watchers/followers)
- Rating CSAT inline (quando resolvido)
- Campos customizados extensíveis

### Fase 3 — Motor de SLA e Automações

**Novas tabelas DB**:
- `support_sla_policies` — Políticas SLA configuráveis por prioridade/tipo
- `support_ticket_history` — Audit log de todas as alterações
- `support_automations` — Regras de auto-assign, escalação, notificação

**Funcionalidades**:
- Página de configuração de SLAs (tempos por prioridade × tipo)
- Auto-cálculo de `sla_deadline` na criação do ticket baseado na política
- Escalação automática quando SLA < 25%
- Auto-assign por round-robin ou por departamento
- Notificação ao agente quando atribuído

**Novas rotas**:
- `/dashboard/helpdesk/sla-policies` — Gestão de políticas SLA
- `/dashboard/helpdesk/automations` — Regras de automação

### Fase 4 — Base de Conhecimento e CSAT

**Novas tabelas DB**:
- `support_kb_articles` — Artigos da base de conhecimento (título, conteúdo markdown, categoria, tags, status)
- `support_kb_categories` — Categorias dos artigos
- `support_csat_ratings` — Avaliações de satisfação por ticket

**Funcionalidades**:
- Página KB com pesquisa full-text, categorias e artigos
- Sugestão automática de artigos KB no composer (baseado no assunto do ticket)
- Formulário CSAT enviado ao cliente quando ticket é resolvido
- Dashboard CSAT com score médio, tendência e distribuição

**Novas rotas**:
- `/dashboard/helpdesk/knowledge-base` — Base de Conhecimento
- `/dashboard/helpdesk/satisfaction` — Dashboard CSAT

### Fase 5 — Realtime e Polimento Final

- Activar realtime nas tabelas `support_tickets` e `support_ticket_messages`
- Indicadores de "agente a escrever" no thread
- Notificações in-app para novos tickets e mensagens
- Exportação de relatórios (CSV)
- Skeleton loaders em todas as páginas
- Mobile responsive audit

---

## Estrutura Técnica

```text
src/
├── pages/dashboard/helpdesk/
│   ├── HelpdeskDashboard.tsx      (enriquecido: gráficos, métricas avançadas)
│   ├── HelpdeskTicketsList.tsx     (kanban + tabela + bulk actions)
│   ├── HelpdeskTicketDetail.tsx    (tabs, audit, anexos)
│   ├── HelpdeskCannedResponses.tsx (existente)
│   ├── HelpdeskSLAPolicies.tsx     (NOVO)
│   ├── HelpdeskAutomations.tsx     (NOVO)
│   ├── HelpdeskKnowledgeBase.tsx   (NOVO)
│   └── HelpdeskSatisfaction.tsx    (NOVO)
├── components/helpdesk/
│   ├── (5 existentes)
│   ├── TicketKanbanBoard.tsx       (NOVO — vista kanban)
│   ├── TicketBulkActions.tsx       (NOVO — acções em massa)
│   ├── TicketActivityTimeline.tsx  (NOVO — audit log visual)
│   ├── TicketMergeDialog.tsx       (NOVO)
│   ├── AgentAssignDropdown.tsx     (NOVO)
│   ├── TicketAttachments.tsx       (NOVO)
│   ├── CSATWidget.tsx              (NOVO)
│   ├── KBArticleEditor.tsx         (NOVO)
│   ├── KBArticleSuggester.tsx      (NOVO)
│   └── HelpdeskCharts.tsx          (NOVO — gráficos do dashboard)
└── hooks/
    ├── useHelpdeskTickets.ts       (existente, expandir com métricas)
    ├── useHelpdeskCannedResponses.ts (existente)
    ├── useHelpdeskSLA.ts           (NOVO)
    ├── useHelpdeskAutomations.ts   (NOVO)
    ├── useHelpdeskKB.ts            (NOVO)
    ├── useHelpdeskCSAT.ts          (NOVO)
    └── useHelpdeskHistory.ts       (NOVO)
```

## Critérios de Aceitação
- Dashboard com pelo menos 6 KPIs acionáveis e 2 gráficos
- Vista Kanban funcional com drag & drop
- Bulk actions na lista (mínimo 3 acções)
- Detalhe com tabs, audit trail e anexos
- SLAs configuráveis por prioridade
- CSAT funcional com score médio no dashboard
- Todas as páginas com skeleton loaders e estados vazios

## Riscos
- Volume de alterações elevado — implementar por fases para evitar regressões
- Tabelas novas necessitam RLS policies cuidadosas
- Realtime pode impactar performance se mal configurado

