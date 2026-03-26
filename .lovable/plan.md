

# Dashboard de Vendas Adaptativo — Plano de Implementação

## Análise do Estado Atual

O projeto já tem infraestrutura relevante:
- **`useDashboardRole`** — mapeia workspace roles para `comercial | gestor | suporte | admin`
- **`ActivityProfileContext`** — perfis de atividade por workspace
- **`WeeklyDashboard`** — dashboard atual com war-room, KPIs, AI strategy, deals at risk
- **`ProfileSettings`** — secção de perfil em Settings
- **`birth_date`** campo já existe em `contacts`, `leads`, `companies` (mas NÃO no perfil do utilizador)
- 40+ componentes dashboard existentes (KPICards, PipelineHealth, SalesGoals, etc.)

## Diferenças-Chave vs Spec

O spec pede adaptação por **idade do utilizador** e **função comercial**. O sistema atual adapta por **workspace role** (owner/admin/agent). A ponte é:
1. Adicionar `birth_date` e `sales_function` ao perfil do utilizador (tabela `profiles`)
2. Criar um hook `useAdaptiveDashboard` que combina idade + função para determinar layout
3. Renderizar dashboard adaptativo na rota `/dashboard` baseado no perfil

## Fases de Implementação

### Fase 1 — MVP: Perfil + Dashboard Gestor (prioridade)

**1.1 Schema: adicionar campos ao perfil**
- Migration: `ALTER TABLE profiles ADD COLUMN birth_date date, ADD COLUMN sales_function text CHECK (sales_function IN ('vendedor','gestor','diretor','ceo'))`

**1.2 UI de perfil obrigatório**
- Criar `AdaptiveProfileSetup` — modal/step que aparece se `birth_date` ou `sales_function` forem null
- Integrar no fluxo pós-onboarding ou no `WeeklyDashboard` como gate

**1.3 Hook `useAdaptiveDashboard`**
- Calcular `ageGroup`: `young` (18-29), `standard` (30-50), `senior` (50+)
- Mapear `sales_function` para layout config
- Retornar: `{ ageGroup, salesFunction, layoutConfig, textSize, showGamification }`

**1.4 Dashboard Gestor de Vendas (implementar primeiro)**
- Criar `AdaptiveDashboardGestor` com as secções do spec:
  - Header com seletor de período
  - Alertas inteligentes (3 níveis: crítico/atenção/oportunidade)
  - 4 MetricCards com comparações (vendas, leads, pipeline, reuniões)
  - Metas do trimestre com barras de progresso + projeção
  - Comparativo semanal/mensal
  - Benchmarking (individual vs equipa vs top vs indústria)
  - Oportunidades + Ações prioritárias
- Reutilizar componentes existentes: `RevenueTargetStrip`, `PipelineHealthCard`, `DashboardKPICards`, `SalesGoalsWidget`

**1.5 Componentes reutilizáveis novos**
- `AdaptiveMetricCard` — valor + % vs semana + % vs mês + projeção
- `GoalProgressBar` — barra com projeção, gap, ritmo necessário, cor por status
- `AlertBanner` — 3 níveis com ação sugerida
- `BenchmarkCard` — comparação 4 eixos

### Fase 2 — Adaptação por idade e função

**2.1 Layouts por função**
- `AdaptiveDashboardVendedor` — foco individual (quota, pipeline pessoal, leaderboard)
- `AdaptiveDashboardDiretor` — foco estratégico (CAC, LTV, churn, forecast)
- `AdaptiveDashboardCEO` — executivo minimalista (6 KPIs, score saúde, decisões pendentes)

**2.2 Adaptação por idade**
- Young (18-29): cores vibrantes, gamificação (badges, streaks), linguagem casual
- Standard (30-50): dashboard completo, todas as features
- Senior (50+): interface simplificada, texto 18px, menos elementos, KPIs essenciais apenas

**2.3 Router adaptativo**
- No `/dashboard`, o `WeeklyDashboard` delega para o layout correto via `useAdaptiveDashboard`

### Fase 3 — Inteligência (futura)

- Sistema de alertas com dados reais (queries a opportunities, leads, pipeline)
- Sugestões de ação baseadas em AI (reutilizar `AIStrategyPanel`)
- Benchmarking com dados reais da equipa

### Fase 4 — Avançado (futura)

- Filtros de período avançados
- Export PDF/email
- Gráficos de tendência 6-12 meses

## Dados Mock

Para a Fase 1, criar `src/data/adaptiveDashboardMock.ts` com dados realistas seguindo a estrutura do spec (metrics, alerts, goals, benchmarks).

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|---|---|
| `migration` | ADD `birth_date`, `sales_function` a `profiles` |
| `src/hooks/useAdaptiveDashboard.ts` | Novo hook central |
| `src/components/adaptive-dashboard/AdaptiveProfileSetup.tsx` | Gate de perfil |
| `src/components/adaptive-dashboard/AdaptiveMetricCard.tsx` | Card métrica com comparações |
| `src/components/adaptive-dashboard/GoalProgressBar.tsx` | Barra progresso com projeção |
| `src/components/adaptive-dashboard/AlertBanner.tsx` | Alertas 3 níveis |
| `src/components/adaptive-dashboard/BenchmarkCard.tsx` | Comparação 4 eixos |
| `src/components/adaptive-dashboard/AdaptiveDashboardGestor.tsx` | Layout Gestor completo |
| `src/data/adaptiveDashboardMock.ts` | Dados mock |
| `src/pages/WeeklyDashboard.tsx` | Integrar gate + delegação adaptativa |

## Notas Técnicas

- Usar validation trigger (não CHECK constraint) para `sales_function` se necessário
- O `useDashboardRole` existente pode coexistir — o novo hook `useAdaptiveDashboard` é complementar e foca na experiência visual, não nos permissões
- Dados mock na Fase 1, queries reais progressivamente na Fase 3
- Começar pela Fase 1 completa (Gestor de Vendas), depois expandir

