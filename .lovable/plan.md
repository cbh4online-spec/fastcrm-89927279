

# Dashboard Resumo de RFQs com Indicadores de Deadlines

## Objetivo
Criar uma nova página `/dashboard/procurement/rfqs-dashboard` com KPIs, timeline de deadlines, e listagem visual de RFQs organizados por urgência.

## Alterações

### 1. Nova página `src/pages/procurement/RFQsDashboardPage.tsx`
- **KPI Strip** (4 cards usando `KPICard` do design system):
  - Total RFQs ativas | Cotações recebidas | Expiradas | A expirar em 7 dias
- **Timeline de Deadlines** — lista vertical ordenada por `due_date` com indicadores visuais:
  - Vermelho pulsante: expirado
  - Laranja: ≤3 dias
  - Amarelo: ≤7 dias
  - Verde: >7 dias
- **Gráfico Donut** — distribuição por estado (Recharts `PieChart`)
- **Tabela de RFQs urgentes** — top 10 por proximidade de deadline, com badge colorido e link para detalhe
- Dados via `useRFQs` existente, processamento client-side com `useMemo`

### 2. Registo da rota em `src/App.tsx`
- Import do componente
- Nova `Route` em `/dashboard/procurement/rfqs-dashboard`

### 3. Navegação no menu procurement
- Adicionar link ao sidebar/menu de procurement (se existente)

### Ficheiros
- **Criar**: `src/pages/procurement/RFQsDashboardPage.tsx`
- **Editar**: `src/App.tsx` (import + rota)
- **Editar**: ficheiro de navegação procurement (sidebar links)

