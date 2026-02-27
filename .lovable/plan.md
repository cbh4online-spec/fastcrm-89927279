

# Reorganizar Dashboard: KPIs em Destaque + Grid Compacto

## Layout Actual vs Novo

```text
ACTUAL:                              NOVO:
+---------------------------+        +---------------------------+
| Header + "Novo"           |        | Header + "Novo"           |
+---------------------------+        +---------------------------+
| Ask Proactive Nudge       |        | Ask Proactive Nudge       |
+---------------------------+        +---------------------------+
| RevenueHero (full width)  |        | RevenueHero (full width)  |
+---------------------------+        +---------------------------+
|                           |        | KPI Cards (5 em linha)    |
| 8 cols     | 4 cols       |        | Leads|Opps|Prop|Pend|Rev  |
| Forecast   | Pipeline HP  |        +---------------------------+
| Deals Risk | PLG Signals  |        | 3 colunas compactas       |
| AI Actions | Events       |        | Forecast  |Pipeline|Confid|
| Automation | Birthdays    |        | DealsRisk |PLG Sig |Compar|
|            | Confidence   |        | AI Action |Events  |Bdays |
|            | Comparison   |        | Automation|        |      |
+---------------------------+        +---------------------------+
```

## Alteracoes

### 1. Adicionar DashboardKPICards ao Dashboard

O componente `DashboardKPICards` ja existe com 5 KPIs (Leads, Oportunidades Activas, Propostas Enviadas, Propostas Pendentes, Previsao de Receita) mas nao esta a ser usado na pagina principal. Sera adicionado logo apos o `RevenueHero`.

Sera importado o hook `useDashboardData` para fornecer os dados dos KPIs.

### 2. Reorganizar grid para 3 colunas compactas

Substituir o layout actual de 8+4 colunas por uma grelha de 3 colunas iguais (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), distribuindo os widgets de forma equilibrada:

- **Coluna 1**: ForecastTrendChart, DealsAtRiskList, AIActionSuggestions, DashboardAutomationSuggestions
- **Coluna 2**: PipelineHealthCard, PLGSignalsFeed, UpcomingEventsWidget
- **Coluna 3**: ForecastConfidenceCard, PipelineComparisonCard, UpcomingBirthdaysWidget

### 3. Reduzir espacamento

Mudar o `gap` e `space-y` de 6 para 4 para um layout mais compacto e denso.

## Ficheiro a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/pages/Dashboard.tsx` | Importar DashboardKPICards + useDashboardData, adicionar linha de KPIs, reorganizar grid para 3 colunas com gap reduzido |

