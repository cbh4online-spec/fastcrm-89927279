
# Time Tracking & Custos — Helpdesk Tickets

## 1. Novas tabelas (migração)

### `support_ticket_time_entries`
- `ticket_id`, `user_id`, `duration_minutes` (int), `description`, `entry_type` (manual | timer), `started_at`, `ended_at`, `hourly_rate` (numeric), `cost` (numeric, computed)
- RLS: membros do workspace podem ler/criar; só o autor ou admin pode editar/apagar

### `support_ticket_expenses`
- `ticket_id`, `user_id`, `expense_type` (deslocação | material | licença | outro), `description`, `amount` (numeric), `currency` (default EUR)
- RLS: membros do workspace podem ler/criar; só o autor ou admin pode editar/apagar

### Coluna em `support_tickets`
- Adicionar `total_time_minutes` (int default 0) e `total_cost` (numeric default 0) — campos desnormalizados atualizados via trigger para performance na listagem

## 2. Hooks

### `useTicketTimeTracking(ticketId)`
- CRUD de time entries + timer state (start/stop/pause com timestamps)
- Totais calculados: tempo total, custo total de mão-de-obra

### `useTicketExpenses(ticketId)`
- CRUD de despesas
- Total acumulado de despesas

## 3. UI — Detalhe do Ticket

### Nova tab "Tempo & Custos" no detalhe
- **Timer**: botão Start/Stop/Pause com cronómetro visual em tempo real
- **Registos manuais**: formulário rápido (duração, descrição, taxa horária)
- **Lista de entradas de tempo**: tabela com agente, duração, custo, data
- **Despesas**: formulário rápido (tipo, descrição, valor) + lista
- **Resumo**: cards com Tempo Total, Custo M.O., Despesas, Custo Total

## 4. UI — Listagem de Tickets

- Nova coluna **"Tempo"** com `Xh Ym` formatado
- Nova coluna **"Custo"** com valor em EUR

## 5. UI — Dashboard

- Novo KPI card: **Custo Médio por Ticket**
- Novo KPI card: **Tempo Médio por Ticket**
- Gráfico de custos por departamento (se disponível)

## 6. Critérios de aceitação
- Timer funciona em tempo real (start/stop/pause), persiste no backend
- Entradas manuais de tempo com taxa horária calculam custo automaticamente
- Despesas registadas com tipo, descrição e valor
- Totais visíveis no detalhe, listagem e dashboard
- Todos os dados protegidos por RLS ao workspace
