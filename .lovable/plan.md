

# Premium Executive Sales Dashboard — Plano de Implementação

## Diagnóstico

O `WeeklyDashboard` atual é funcional mas apresenta-se como um "war room operacional" denso — muitas secções ao mesmo nível visual, sem hierarquia clara, sem contexto temporal (trimestre/semana), e sem métricas de variação semana-a-semana ou mês-a-mês baseadas em dados reais. O header é genérico ("Bom dia") e os quick actions são botões soltos sem agrupamento visual.

Pontos fortes a preservar: hooks de dados reais (`useWeeklyPerformance`, `useDailyBrief`, `useIntelligencePanel`), componentes com loading/empty/error states, i18n PT-PT, lógica de conversão e health score.

## Ficheiros a alterar

| Ficheiro | Ação |
|---|---|
| `src/pages/WeeklyDashboard.tsx` | Recompor layout com nova ordem de secções |
| `src/components/weekly-dashboard/PremiumDashboardHeader.tsx` | **Novo** — header executivo com Q/semana |
| `src/components/weekly-dashboard/ImmediateAttentionBanner.tsx` | **Novo** — alertas comerciais urgentes |
| `src/components/weekly-dashboard/PremiumKPICards.tsx` | **Novo** — 4 KPIs com variação semanal/mensal |
| `src/components/weekly-dashboard/TrendCompositionSection.tsx` | **Novo** — evolução + pipeline por fase (placeholder) |
| `src/components/weekly-dashboard/QuarterGoalsProjection.tsx` | **Novo** — metas trimestrais com projeção |
| `src/components/weekly-dashboard/QuickAccessFooter.tsx` | **Novo** — links rápidos compactos |
| `src/i18n/locales/pt/dashboard.json` | Adicionar ~30 novas keys |
| `src/i18n/locales/en/dashboard.json` | Adicionar keys correspondentes |
| `src/i18n/locales/es/dashboard.json` | Adicionar keys correspondentes |

## Ficheiros que NÃO mudam

- `src/hooks/useWeeklyPerformance.ts` — dados já suficientes
- `src/hooks/useDailyBrief.ts`, `useWeeklyStrategy.ts`, `useKernelDecisions.ts`
- `src/components/weekly-dashboard/RevenueTargetStrip.tsx` — mantém-se (integrado no layout)
- `src/components/weekly-dashboard/ExecutionRequirements.tsx` — mantém-se
- `src/components/weekly-dashboard/PriorityDealsTable.tsx` — mantém-se
- `src/components/weekly-dashboard/TodayActionPlan.tsx` — mantém-se
- `src/components/weekly-dashboard/AIStrategyPanel.tsx` — mantém-se
- `src/components/dashboard/DealsAtRiskList.tsx` — mantém-se
- `src/components/dashboard/PipelineHealthCard.tsx` — mantém-se
- `src/components/dashboard/DailyBriefWidget.tsx` — mantém-se
- Auth, billing, roles, schema, layout — intocados

## Plano por passos

### 1. PremiumDashboardHeader
- Título "Dashboard de Vendas" (sem "Premium" — é demasiado marketing)
- Subtítulo dinâmico: "Q1 2026 • Semana 12 de 13" (calculado a partir da data)
- Manter chips de Revenue/Hot Leads/Decisões do `CommandCenterHeader` actual
- Adicionar badge de comparação "Semana vs semana" (visual, sem funcionalidade por agora)
- Saudação e nome do utilizador mantidos

### 2. AI Command Box (evolução leve)
- Manter o `AIQuestionBox` actual
- Envolver com título "Assistente de Vendas IA" e 4 quick chips abaixo: "Como aumentar vendas?", "Deals prioritários", "Analisar pipeline", "Diagnóstico de leads"
- Os chips disparam `handleSubmit` do `AIQuestionBox` — wrapper component `PremiumAISection`

### 3. ImmediateAttentionBanner
- Card destacado (border-l-4 amber ou red)
- Consome `useWeeklyPerformance` → se revenue < 50% da meta, mostrar "Vendas abaixo do ritmo"
- Se leads < 50%, mostrar "Leads abaixo da meta"
- Calcular "falta X por semana para atingir objectivo" a partir do gap e semanas restantes no trimestre
- CTA "Ver plano de ação" → scroll ou navigate para TodayActionPlan
- Empty state: "Tudo no bom caminho" com ícone de check

### 4. PremiumKPICards (4 cards)
- Vendas fechadas, Leads qualificados, Negócios em pipeline, Reuniões realizadas
- Dados de `useWeeklyPerformance` (actual e target já existem)
- Variação semana/mês: sem dados históricos no hook actual → mostrar "vs meta: X%" como proxy, com nota de que WoW/MoM requer dados futuros
- Visual state: healthy (green border-top) / warning (amber) / critical (red) baseado no `status` do metric
- Projeção trimestral: derivada do ritmo semanal × semanas restantes (calculável)

### 5. TrendCompositionSection
- 3 mini-cards lado a lado: "Evolução Vendas", "Leads por Fonte", "Pipeline por Fase"
- Sem dados de séries temporais no hook actual → mostrar placeholder elegante: "Dados de tendência disponíveis brevemente" com ícone de gráfico
- Serve de placeholder para futura integração de gráficos (Recharts)

### 6. QuarterGoalsProjection
- Reutilizar lógica do `ExecutionRequirements` (target, actual, gap) + cálculo de semanas restantes no trimestre
- Barras de progresso com projeção: barra sólida (actual) + barra tracejada (projeção)
- Status labels: "Meta superada" / "No caminho" / "Atenção" / "Em risco"
- Ritmo necessário: "Precisas de X€/semana para atingir a meta"

### 7. Opportunities & Actions (recomposição)
- Manter `PriorityDealsTable` e `TodayActionPlan` — reorganizar com header de secção "Oportunidades e Ações"
- Adicionar separador visual com título e subtítulo

### 8. QuickAccessFooter
- 4 compact cards em row: Pipeline detalhado, Previsões IA, Alertas, Exportar
- Cada um navega para rota existente (`/dashboard/opportunities`, `/dashboard/strategy`, etc.)
- Estilo: ícone + label, hover com sombra leve

### 9. Recomposição do WeeklyDashboard
Nova ordem:
1. `PremiumDashboardHeader`
2. `PremiumAISection` (wrapper do AIQuestionBox + chips)
3. `ImmediateAttentionBanner`
4. `PremiumKPICards`
5. `RevenueTargetStrip` (mantido — é valioso)
6. `QuarterGoalsProjection`
7. `TrendCompositionSection` (placeholder)
8. Section header "Oportunidades e Ações" + `PriorityDealsTable` / `TodayActionPlan`
9. `DealsAtRiskList` + `PipelineHealthCard` + `AIStrategyPanel`
10. `DailyBriefWidget`
11. `QuickAccessFooter`
12. `AdaptiveDashboardGestor` (condicional, mantido)

O `ExecutionRequirements` é movido para dentro do `QuarterGoalsProjection` ou removido da page principal (o conteúdo é subsumido pela nova secção de metas).

### 10. i18n
Adicionar ~30 keys novas em PT, EN, ES para headers, labels, estados e placeholders.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Dados WoW/MoM não existem no hook | Mostrar "vs meta" como proxy, placeholder para variação real |
| Dados de tendência (séries) inexistentes | Placeholder visual elegante, sem dados falsos |
| Quebrar fluxos existentes | Componentes existentes mantidos intactos, apenas reordenados |
| Mobile layout com demasiadas secções | Usar `grid-cols-1` em mobile, colapsar secções menos críticas |

## Dados em falta

- **Week-over-week / Month-over-month reais**: o hook `useWeeklyPerformance` só calcula a semana actual. Para variação real seria preciso queries a semanas anteriores. Usaremos "vs meta %" como proxy.
- **Séries temporais (6 semanas)**: não existem agregados históricos. Placeholder.
- **Leads por fonte**: a tabela `leads` tem `source` mas não é agregada. Placeholder.
- **Pipeline por fase**: `useIntelligencePanel` tem dados de stages mas não formatados para gráfico. Placeholder.

