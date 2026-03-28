

## Corrigir sidebar + Enriquecer módulo de Renovações

### Problema 1: Falta o menu lateral

As páginas `RenewalsPage.tsx` e `RenewalDetailPage.tsx` não estão envolvidas em `DashboardLayout`, ao contrário de outras páginas (ex: Leads, Contacts). Basta adicionar o wrapper.

### Problema 2: Módulo básico demais

O módulo atual é uma lista simples com stats e filtro por status. Vou enriquecer com:

#### A. Tabs de navegação na página principal
- **Contratos** (lista atual, default)
- **Kanban** — colunas por status (active/paused/expired/cancelled) com drag-and-drop para mover contratos
- **Alertas** — painel expandido dos alertas (já existe `RenewalAlerts` mas está comprimido)
- **Calendário** — vista temporal das renovações próximas (próximos 90 dias, agrupados por semana/mês)

#### B. Filtros avançados
- Filtro por **tipo de item** (domain, software_license, hours_pack, retainer, subscription)
- Filtro por **risco** (low, medium, high via health_score)
- Filtro por **empresa** (dropdown com empresas únicas)
- Ordenação por MRR, data renovação, health score

#### C. Seleção múltipla + ações em massa
- Reutilizar `BulkActionsBar` para: pausar/retomar contratos em massa, exportar

#### D. KPIs melhorados
- Adicionar: ARR total, MRR médio por contrato, taxa de churn (cancelled/total), distribuição por tipo

### Ficheiros a alterar

| Ficheiro | Ação |
|---|---|
| `src/pages/RenewalsPage.tsx` | Envolver em `DashboardLayout`, adicionar tabs, filtros, Kanban, KPIs |
| `src/pages/RenewalDetailPage.tsx` | Envolver em `DashboardLayout` |
| `src/components/renewals/RenewalsKanbanView.tsx` | **Novo** — vista kanban por status com drag-and-drop |
| `src/components/renewals/RenewalsCalendarView.tsx` | **Novo** — vista calendário de renovações próximas |

Sem alterações de base de dados.

