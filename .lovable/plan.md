

# Funis — Módulo Acima da Concorrência

## Diagnóstico

Após análise detalhada de 36+ ficheiros do módulo, identifiquei 4 problemas críticos:

1. **KPIs da homepage mostram "0"** — Os cards (Total Funis, Publicados, Verticais) usam contagens básicas mas não incluem métricas de performance real (views, conversões, receita). Os KPIs de performance só aparecem dentro de cada funil individualmente.

2. **Sem dashboard proativo** — A homepage é uma lista estática sem recomendações, sem alertas de performance, sem sugestões de otimização. O utilizador não sabe o que fazer a seguir.

3. **Consumo de créditos inconsistente** — O `AIFunnelChat` consome créditos via `useCreditWallet` (sistema legado de créditos de funis), mas TAMBÉM passa pelo `ai-gate` na edge function. Dupla cobrança potencial. O `FunnelAIInsightsTab` e `FunnelAnalyticsTab` chamam IA sem qualquer controlo de créditos no frontend.

4. **Analytics com dados parciais** — `StatsOverviewTab` funciona bem com dados reais de `vertical_landing_events`, mas os cards da homepage não agregam esses dados. Não há visão consolidada cross-funnel.

---

## Plano de Implementação (4 blocos)

### Bloco 1: Fix KPIs + Dashboard Consolidado

Substituir os 4 KPI cards estáticos da homepage por métricas reais agregadas.

| Componente | Descrição |
|---|---|
| `FunnelsHomeDashboard.tsx` | **Novo** — Dashboard consolidado com KPIs reais: Total Views (sum de todos os funis), Total Leads (sum de form_submits), Taxa de Conversão Média, Receita Total. Busca dados de `vertical_landing_events` + `funnel_step_stats` |
| `FunnelPerformanceRanking.tsx` | **Novo** — Ranking dos funis por performance (views, conversão). Top 3 e worst 3 com indicadores visuais |
| `FunnelAdvisorBanner.tsx` | **Novo** — Banner IA no topo: "O funil /empresas tem bounce rate de 78% — otimize o headline" ou "Nenhum funil publicado — publique o primeiro" |

**Integração**: Substituir a secção de KPI cards na `FunnelsList.tsx` pelo novo `FunnelsHomeDashboard`.

### Bloco 2: Garantir Consumo de Créditos

Corrigir a dupla cobrança e garantir que TODA IA consome via `ai-gate`:

| Ficheiro | Mudança |
|---|---|
| `AIFunnelChat.tsx` | **Modificar** — Remover consumo via `useCreditWallet` (legado). O `ai-gate` na edge function `ai-funnel-builder` já cobra. Manter apenas verificação de quota no frontend para UX (mostrar erro antes de chamar) |
| `FunnelAIInsightsTab.tsx` | **Modificar** — Adicionar verificação de quota no frontend antes de chamar `funnel-ai-insights` (a edge function já tem ai-gate) |
| `FunnelAnalyticsTab.tsx` | **Modificar** — Idem para o botão "Analisar com IA" |
| `StatsOverviewTab.tsx` | **Modificar** — O botão "Analisar com IA" precisa de indicação de custo (Badge "1 crédito") |

### Bloco 3: Funnel Health Score + Proatividade

| Componente | Descrição |
|---|---|
| `FunnelHealthScore.tsx` | **Novo** — Score 0-100 por funil baseado em: conversion rate vs benchmark, bounce rate, volume de tráfego, recência de updates. Semáforo visual |
| `FunnelQuickOptimize.tsx` | **Novo** — Cards de ação rápida: "Adicionar opt-in ao step 2", "A/B test do headline", "Ativar tracking UTM". Baseado em análise automática da configuração |
| `FunnelComparisonView.tsx` | **Novo** — Comparação side-by-side de 2 funis (conversão, tráfego, receita) para identificar o que funciona |

### Bloco 4: Analytics Consolidados Cross-Funnel

| Componente | Descrição |
|---|---|
| `CrossFunnelAnalytics.tsx` | **Novo** — Tab "Analytics" na homepage com gráfico de tendência cross-funnel (últimos 30 dias), distribuição de tráfego por funil, top sources UTM agregadas |
| `FunnelROICard.tsx` | **Novo** — ROI por funil: custo (créditos IA gastos) vs receita gerada |

**Nova tab**: Adicionar "Analytics" entre "Captura" e "Domínios" na `FunnelsList.tsx`.

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|---|---|
| `src/components/funnels/FunnelsHomeDashboard.tsx` | **Novo** — KPIs reais + ranking |
| `src/components/funnels/FunnelAdvisorBanner.tsx` | **Novo** — Banner proativo |
| `src/components/funnels/FunnelHealthScore.tsx` | **Novo** — Score composto |
| `src/components/funnels/FunnelQuickOptimize.tsx` | **Novo** — Ações rápidas |
| `src/components/funnels/FunnelComparisonView.tsx` | **Novo** — Comparação |
| `src/components/funnels/CrossFunnelAnalytics.tsx` | **Novo** — Analytics globais |
| `src/components/funnels/FunnelROICard.tsx` | **Novo** — ROI tracking |
| `src/components/funnels/FunnelsList.tsx` | **Modificar** — Integrar dashboard, banner, nova tab Analytics |
| `src/components/funnels/ai-builder/AIFunnelChat.tsx` | **Modificar** — Remover dupla cobrança de créditos |
| `src/components/funnels/tabs/FunnelAIInsightsTab.tsx` | **Modificar** — Indicação de custo |
| `src/components/funnels/tabs/FunnelAnalyticsTab.tsx` | **Modificar** — Indicação de custo |
| `src/components/funnels/stats/StatsOverviewTab.tsx` | **Modificar** — Badge de custo no botão IA |

## Diferenciadores vs Concorrência

```text
Feature                  ClickFunnels  Leadpages  FastCRM
────────────────────────────────────────────────────────
Cross-funnel dashboard       ✗           ✗         ✓
AI Advisor proativo          ✗           ✗         ✓
Health Score automático      ✗           ~         ✓
Funnel comparison            ~           ✗         ✓
ROI tracking (custo IA)      ✗           ✗         ✓
CRM-native (pipeline)        ✗           ✗         ✓
Quick optimize actions       ✗           ✗         ✓
Credit enforcement           n/a         n/a       ✓
```

