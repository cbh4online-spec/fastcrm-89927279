

# Redesenhar Dashboard — Revenue Operating System Layout

## Problema Actual
O dashboard tem um layout genérico: header simples, KPIs em faixa, e 3 colunas uniformes com widgets empilhados sem hierarquia visual clara. Não transmite a identidade "Revenue OS" nem prioriza informação actionable.

## Novo Layout

```text
┌─────────────────────────────────────────────────────────┐
│  ⚡ Revenue Operating System           [+ Novo] [Data]  │
│  "Bom dia, João. 3 deals precisam de atenção."          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌── Revenue Hero (full-width, premium glass+gold) ──┐  │
│  │ €247K expected  │ Stage: €180K │ Risk-adj: €210K   │  │
│  │ Confidence: 72  │ +12% trend   │ 14 opportunities  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ KPIs (5 cards, redesigned with gold accents) ────┐  │
│  │ Leads │ Opps │ Propostas │ Pendentes │ Receita     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─── Intelligence Strip (2 cols) ───────────────────┐  │
│  │ ┌─ AI Actions ──────┐  ┌─ Deals at Risk ────────┐ │  │
│  │ │ Revenue Brain      │  │ Alertas prioritários   │ │  │
│  │ │ (top 5 actions)    │  │ (top 5 risks)          │ │  │
│  │ └───────────────────┘  └────────────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─── Operational Grid (3 cols) ─────────────────────┐  │
│  │ ┌ Pipeline   ┐ ┌ Forecast   ┐ ┌ Daily Brief    ┐ │  │
│  │ │ Health     │ │ Trend Chart│ │ + Exec Brief   │ │  │
│  │ └────────────┘ └────────────┘ └────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─── Secondary (3 cols) ────────────────────────────┐  │
│  │ PLG Signals │ Automations  │ Events+Birthdays     │  │
│  │             │ + Comparison │                       │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Alterações

### `src/pages/Dashboard.tsx` — Reestruturar layout completo
- **Header premium**: Substituir header genérico por headline com gradiente gold, saudação contextual (hora do dia + nome), e status line dinâmica ("X deals precisam de atenção, Y tarefas pendentes") usando dados de `useIntelligencePanel`
- **Intelligence Strip**: Nova secção de 2 colunas que eleva `AIActionSuggestions` e `DealsAtRiskList` para logo abaixo dos KPIs — são os widgets mais actionable
- **Operational Grid**: 3 colunas com `PipelineHealthCard`, `ForecastTrendChart`, e briefs (Daily + Executive combinados)
- **Secondary Grid**: 3 colunas com `PLGSignalsFeed`, `DashboardAutomationSuggestions` + `PipelineComparisonCard`, e `UpcomingEventsWidget` + `UpcomingBirthdaysWidget`
- Remover `ForecastConfidenceCard` standalone (dados já presentes no `RevenueHero`)
- Manter `AskProactiveNudge` e Context OS banner

### `src/components/dashboard/RevenueHero.tsx` — Upgrade visual premium
- Aplicar estilo `glass-premium` com border gold
- Gradiente de fundo dark+gold em vez do actual `primary/5`
- Label "REVENUE FORECAST" com tracking wide e cor gold
- Valores com tipografia maior e mais bold
- Adicionar glow sutil no card

### `src/components/dashboard/DashboardKPICards.tsx` — Acentos gold
- Ícones com acentos gold nos cards primários
- Border sutil gold no hover
- Manter a grid 5 colunas existente

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/pages/Dashboard.tsx` | Reestruturar layout com hierarquia visual e intelligence strip |
| `src/components/dashboard/RevenueHero.tsx` | Visual premium glass+gold |
| `src/components/dashboard/DashboardKPICards.tsx` | Acentos gold subtis |

