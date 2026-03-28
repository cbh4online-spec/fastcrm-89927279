

# Propostas — Dashboard de Análise

## O Problema

O tab "Análise" mostra apenas um placeholder "Em breve". Já existe o hook `useProposalAnalytics` que consulta `proposal_analytics` e o hook `useProposals` que traz todas as propostas — ambos podem alimentar um dashboard completo.

## Plano

Criar um componente `ProposalAnalyticsTab` e usá-lo no `case "analytics"` do `ProposalsList.tsx`.

### Conteúdo do Dashboard

**1. KPI Cards (row de 6)**
- Visualizações totais
- Checkouts iniciados
- Pagamentos completos
- Taxa de conversão (%)
- Receita total
- Valor médio por proposta

**2. Gráficos (grid 2 colunas)**
- **Distribuição por Estado** — Donut/Pie chart com draft/published/accepted/expired/rejected (dados de `useProposals`)
- **Evolução Mensal** — Bar chart com propostas criadas por mês (últimos 6 meses)

**3. Funil de Conversão**
- Barra visual: Criadas → Publicadas → Visualizadas → Aceitas (percentagens relativas)

**4. Top 5 Propostas** — tabela compacta das propostas com mais views ou maior valor

**5. Performance por Modelo** — tabela com dados de `useProposalAnalytics().byTemplate`

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/components/proposals/ProposalAnalyticsTab.tsx` | **Criar** — componente completo com KPIs, charts (Recharts), funil e tabelas |
| `src/components/proposals/ProposalsList.tsx` | **Modificar** — substituir placeholder por `<ProposalAnalyticsTab />` no case "analytics" |

### Detalhes Técnicos

- Usa `useProposals()` para dados de propostas (estados, valores, datas) e `useProposalAnalytics()` para eventos de tracking (views, checkouts, payments)
- Charts com Recharts (já instalado no projeto) — PieChart para distribuição, BarChart para evolução mensal
- Funil com barras CSS progressivas (sem lib extra)
- Empty states informativos quando não há dados suficientes

