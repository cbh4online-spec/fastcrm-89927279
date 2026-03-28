

# Módulo Controlo de Ponto — Time Tracking, Férias e Geolocalização

## Visão Geral

Módulo completo de gestão de tempo e presenças para o backoffice, com clock-in/out, tracking automático de tempo no sistema, gestão e aprovação de férias/ausências, e verificação de localização para trabalhadores remotos.

## Base de Dados

### Novas tabelas

**`time_entries`** — Registos de ponto (clock-in/out)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| user_id | uuid FK profiles | |
| clock_in | timestamptz | Hora de entrada |
| clock_out | timestamptz | Hora de saída (null se em curso) |
| clock_in_lat / clock_in_lng | numeric | Localização GPS entrada |
| clock_out_lat / clock_out_lng | numeric | Localização GPS saída |
| clock_in_address | text | Morada reversa (geocoding) |
| clock_out_address | text | |
| source | text | manual, system_auto, geofence |
| notes | text | Observações |
| status | text | active, completed, edited, flagged |
| edited_by | uuid | Se corrigido por gestor |
| created_at / updated_at | timestamptz | |

**`session_time_logs`** — Tempo passado no sistema (tracking automático)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| user_id | uuid FK profiles | |
| date | date | Dia |
| active_seconds | integer | Segundos ativos (com atividade real) |
| idle_seconds | integer | Segundos inativos |
| total_seconds | integer | Total no sistema |
| page_views | integer | Páginas visitadas |
| last_activity_at | timestamptz | Última atividade detectada |

**`leave_requests`** — Pedidos de férias/ausências

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| user_id | uuid FK profiles | |
| leave_type | text | vacation, sick, personal, remote, other |
| start_date | date | |
| end_date | date | |
| days_count | numeric | Dias úteis calculados |
| reason | text | |
| status | text | pending, approved, rejected, cancelled |
| reviewed_by | uuid FK profiles | Quem aprovou/rejeitou |
| reviewed_at | timestamptz | |
| review_notes | text | |
| created_at | timestamptz | |

**`leave_balances`** — Saldo de férias por ano

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid PK | |
| workspace_id | uuid FK | |
| user_id | uuid FK profiles | |
| year | integer | |
| total_days | numeric | Dias disponíveis (default 22) |
| used_days | numeric | Dias usados |
| pending_days | numeric | Dias em pedidos pendentes |

RLS em todas as tabelas: utilizador vê os seus registos; gestores/admins vêem todos do workspace.

## Navegação

Novo grupo **"RH"** (ícone: `Clock`, order entre Suporte e Loja Online):

```text
RH
├── Controlo de Ponto      /dashboard/hr/time-clock
├── Tempo no Sistema       /dashboard/hr/session-time
├── Férias & Ausências     /dashboard/hr/leave
├── Meu Registo            /dashboard/hr/my-time
```

Module-gated com `moduleSlug: "hr-time-tracking"`.

## Páginas

### 1. Controlo de Ponto (`/dashboard/hr/time-clock`)
- **Botão Clock-In/Out** grande e claro com hora atual, pede geolocalização (GPS do browser)
- **Tabela do dia**: Lista de funcionários com hora entrada, hora saída, duração, localização (link Google Maps)
- **Filtros**: Data, Funcionário, Status
- **Indicador**: Mapa com pins dos clock-ins (Leaflet ou Google Maps embed)
- **Edição**: Gestor pode corrigir registos com motivo

### 2. Tempo no Sistema (`/dashboard/hr/session-time`)
- **Dashboard**: KPIs — Média diária ativa, Top 5 utilizadores mais ativos, Tendência semanal
- **Tabela**: Utilizador, Data, Tempo ativo, Tempo idle, Total, Páginas
- **Gráfico**: Barras empilhadas (ativo vs idle) por dia/semana
- Dados recolhidos automaticamente via hook `useSessionTracker`

### 3. Férias & Ausências (`/dashboard/hr/leave`)
- **Calendário visual**: Vista mensal com dias marcados por tipo (cores)
- **Lista de pedidos**: Pendentes primeiro, com ações Aprovar/Rejeitar
- **Saldo**: Card por funcionário com dias disponíveis/usados/pendentes
- **Botão "Novo Pedido"**: Dialog com tipo, datas, motivo
- **Workflow**: Pedido → Pendente → Aprovado/Rejeitado (notificação)

### 4. Meu Registo (`/dashboard/hr/my-time`)
- Vista pessoal do utilizador: os seus clock-ins, tempo no sistema, saldo de férias
- Botão de clock-in/out
- Histórico pessoal de pedidos de férias

## Tracking Automático de Sessão

Hook `useSessionTracker.ts` montado no layout principal:
- Detecta atividade (mouse, teclado, scroll) com debounce de 30s
- A cada 5 minutos, faz upsert na `session_time_logs` com incremento de active/idle seconds
- Sem impacto no performance (requestIdleCallback)

## Geolocalização

- No clock-in/out, pede `navigator.geolocation.getCurrentPosition()`
- Guarda lat/lng e faz reverse geocoding (display de morada)
- Mostrar localização no detalhe do registo com link para mapa
- Opcional: gestor pode ver mapa com todos os clock-ins do dia

## Ficheiros

| Ficheiro | Ação |
|----------|------|
| Migração SQL | 4 tabelas + RLS |
| `src/config/routeManifest.ts` | Grupo "rh" + 4 rotas |
| `src/hooks/useSessionTracker.ts` | Auto-tracking tempo no sistema |
| `src/hooks/useTimeEntries.ts` | CRUD clock-in/out |
| `src/hooks/useLeaveRequests.ts` | CRUD férias + aprovação |
| `src/hooks/useLeaveBalances.ts` | Saldos de férias |
| `src/hooks/useSessionTimeLogs.ts` | Query tempo no sistema |
| `src/pages/dashboard/hr/TimeClockPage.tsx` | Controlo de ponto |
| `src/pages/dashboard/hr/SessionTimePage.tsx` | Tempo no sistema |
| `src/pages/dashboard/hr/LeavePage.tsx` | Férias & Ausências |
| `src/pages/dashboard/hr/MyTimePage.tsx` | Vista pessoal |
| `src/components/hr/ClockInOutButton.tsx` | Botão principal |
| `src/components/hr/LeaveCalendar.tsx` | Calendário visual |
| `src/components/hr/LeaveRequestDialog.tsx` | Formulário pedido |
| `src/components/hr/LocationMap.tsx` | Mapa de localização |
| `src/components/hr/SessionTimeChart.tsx` | Gráfico tempo |
| `src/routes/HRRoutes.tsx` | Rotas do módulo |
| `src/config/moduleNavRegistry.ts` | Entrada hr-time-tracking |

