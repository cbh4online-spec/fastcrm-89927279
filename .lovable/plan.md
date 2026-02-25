

# Batch 3 — Dashboard i18n Migration

## Scope

Migrate all 10 dashboard components + the Dashboard page to use `t()` calls. The translation JSON files already have many keys but need ~80 new keys for strings discovered in the components.

## Components to Edit (10 files)

| File | Hardcoded Strings |
|---|---|
| `Dashboard.tsx` | "Home", "Build your CRM...", "New", "New Lead", "New Opportunity", etc. |
| `RevenueHero.tsx` | "Revenue Forecast", "Alta/Média/Baixa confiança", "Dados insuficientes", "Expected case", "Stage-Weighted", "Risk-Adjusted", "Gross" |
| `PipelineHealthCard.tsx` | "Pipeline Health", "Healthy/Watch/At Risk", "Data Quality", "Completeness", "Missing value", "Momentum", "Active (7d)", "Stale" |
| `ForecastConfidenceCard.tsx` | "Is My Forecast Realistic?", confidence messages, "Revenue by Health", "Forecast Blockers", "deals without value/close date", "Slow Stages" |
| `DealsAtRiskList.tsx` | "Deals at Risk", "No deals at risk right now" |
| `AIActionSuggestions.tsx` | "Revenue Brain" |
| `PLGSignalsFeed.tsx` | "Product Signals", "Live", "signups/activated/qualified/pipeline", "Sem sinais de produto", "Ver todos os sinais" |
| `PipelineComparisonCard.tsx` | "Pipeline Health", "active", "View full comparison" |
| `WelcomeOverlay.tsx` | All segment titles/tips/actions in Portuguese, "Bundle ativo" |
| `ForecastTrendChart.tsx` | "Forecast Trend", chart legend labels, hardcoded `pt` locale |
| `DashboardKPICards.tsx` | "Leads", "Oportunidades Ativas", "Propostas Enviadas/Pendentes", "Previsão de Receita", all tooltips |
| `DashboardQuickNav.tsx` | "Navegação Rápida", "CRM", "Leads", "Oportunidades", "Propostas", "Definições", etc. |
| `DashboardSmartAlerts.tsx` | "Alertas Inteligentes", "Tudo em dia!", "Nenhum alerta que exija ação", "crítico(s)", hardcoded `pt` locale |
| `DashboardNextActions.tsx` | "Próximas Ações", "Tarefas mais importantes para hoje", "Tudo em dia!", "Atrasado", "Hoje", type labels, hardcoded `pt` locale |
| `DashboardPipelineSnapshot.tsx` | "Pipeline", "Valor total:", "parado(s)", "Sem oportunidades", "Ver pipeline completo", tooltip strings |
| `DashboardAutomationSuggestions.tsx` | "Automation Suggestions", "new", "View all suggestions" |

## Translation File Updates

Add ~80 new keys to all 4 dashboard.json files covering:
- Revenue hero labels (confidence levels, case labels)
- Pipeline health labels (distribution, quality, momentum)
- Forecast confidence labels (messages, blockers, breakdown)
- KPI card labels and tooltips
- Quick nav labels
- Smart alerts labels
- Next actions labels (task types, overdue)
- Pipeline snapshot labels
- Welcome overlay segment content
- PLG signals labels
- Chart legend labels

## Pattern

Each component gets:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('dashboard');
```

Date-fns locale switches from hardcoded `pt` to dynamic:
```typescript
import { pt, enUS, es, fr } from 'date-fns/locale';
const dateLocales = { pt, en: enUS, es, fr };
const locale = dateLocales[i18n.language] || pt;
```

## Implementation Order

1. Expand all 4 dashboard.json files with new keys
2. Edit all 16 component files in parallel

