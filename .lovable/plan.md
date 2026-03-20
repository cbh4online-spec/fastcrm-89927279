

## Redesign Completo do Dashboard de Analytics dos Funis

Reescrita total do `VerticalStatsTab.tsx` (~684 linhas → ~1800 linhas) e extracção de sub-componentes para manter o código organizado.

### Arquitectura

Dividir em componentes modulares para manter legibilidade:

```text
VerticalStatsTab.tsx          (orchestrator + global controls)
├── stats/StatsOverviewTab.tsx   (KPIs + Insight Banner + Funnel + Benchmarks)
├── stats/StatsTrendsTab.tsx     (Line chart + range selector + period summary)
├── stats/StatsSourcesTab.tsx    (Grouped bars + enhanced table)
├── stats/StatsSectionsTab.tsx   (Heatmap with empty state)
├── stats/StatsGeoDeviceTab.tsx  (Device cards + Geo table)
├── stats/StatsTimelineTab.tsx   (Color-coded events + session grouping)
└── stats/statsHelpers.ts        (shared computations, benchmarks, types)
```

### Ficheiros a criar

1. **`src/components/funnels/stats/statsHelpers.ts`** — Types, constants (benchmarks, section labels, KPI tooltips), helper functions (trend calculation, performance badge logic, action recommendations)

2. **`src/components/funnels/stats/StatsOverviewTab.tsx`**
   - 5 KPI cards com: trend indicator (↑/↓ vs período anterior calculado a partir dos eventos), tooltip (?) com descrição, amber warning dot se abaixo do benchmark
   - Insight Banner dismissável com borda amber: 2-3 bullets auto-gerados a partir dos dados (bounce rate vs benchmark, fonte com melhor/pior conversão), botão "Analisar com IA"
   - Funil de conversão com trapézios via CSS clip-path (Visitantes → Únicos → Sessões → Submissões), anotações de drop-off entre passos, linha tracejada de benchmark
   - Benchmark do setor com barras horizontais, linha vertical amber da taxa do utilizador, badges de cor, link "Como melhorar"

3. **`src/components/funnels/stats/StatsTrendsTab.tsx`**
   - Range selector: 7D | 30D | 90D | Custom (date picker)
   - Dual Y-axis: Visitantes (esquerda) + Taxa Conversão (direita)
   - Anotações de picos no timeline
   - Toggle "Previsão" com linha tracejada projectada 7 dias (regressão linear simples)
   - Card "Resumo do período": melhor dia, pior dia, média diária, total conversões

4. **`src/components/funnels/stats/StatsSourcesTab.tsx`**
   - Bar chart agrupado: Visitas (amber) + Conversões (green) lado a lado, linha de Taxa no eixo secundário
   - Ordenação por taxa de conversão
   - Tabela com colunas: Fonte, Visitas, Conversões, Taxa, Performance (badge 🟢🟡🔴), Ação Recomendada (contextual)
   - Search/filter input

5. **`src/components/funnels/stats/StatsSectionsTab.tsx`**
   - Empty state rico: ilustração, mensagem explicativa, checklist de configuração, botão documentação
   - Com dados: barras horizontais com gradiente de cor (verde >70%, amber 30-70%, vermelho <30%), badge "Secção problema" no maior drop-off

6. **`src/components/funnels/stats/StatsGeoDeviceTab.tsx`**
   - 3 cards lado a lado (Desktop/Mobile/Tablet) com ícone, %, contagem, taxa de conversão, borda verde no melhor
   - Warning se mobile >50% tráfego mas conversão < desktop
   - Geo: tabela com País, Visitas, Conversões, Taxa + flag emojis
   - Empty state com mapa SVG outline

7. **`src/components/funnels/stats/StatsTimelineTab.tsx`**
   - Badges coloridos: 🟡 Visita | 🟢 Conversão
   - Agrupamento por sessão (collapsible)
   - Filtros: Todos | Conversões | Visitas | Por fonte
   - Highlight verde em linhas de conversão
   - Ícone dispositivo, link "Ver perfil" para contactos identificados
   - Badge "Em breve" para session replay

8. **`src/components/funnels/vertical-tabs/VerticalStatsTab.tsx`** (reescrita)
   - Global date range picker persistente no topo (Hoje | 7D | 30D | 90D | Custom)
   - Botão "Exportar" dropdown (CSV, PDF, Copy link)
   - Toggle "Comparar períodos" (mostra current vs previous)
   - Indicador "Atualizado há X min" + botão refresh manual
   - Skeleton loading states em todos os tabs
   - Renderiza os 6 sub-componentes nas TabsContent

### Lógica de dados (sem alterar hooks existentes)

- **Trend vs período anterior**: calcular dividindo os eventos em 2 metades (primeira metade = "anterior", segunda = "atual") para derivar % de mudança
- **Auto-insights**: função pura que analisa os dados computados e gera 2-3 frases baseadas em regras (bounce rate vs benchmark, fonte com 0 conversões mas muitas visitas, etc.)
- **Previsão**: regressão linear simples sobre os últimos 14 dias projectada 7 dias
- **Export CSV**: gerar CSV client-side a partir dos dados em memória
- **Performance badges**: rate > 5% = Alto/verde, 1-5% = Médio/amber, <1% = Baixo/vermelho

### Design tokens (conforme pedido)

- Accent amber: `#F5A623`
- Success: `#1D9E75`
- Warning: `#BA7517`
- Danger: `#E24B4A`
- Card borders: `border border-white/[0.08]` (ou `border-border/50` existente)
- Border-radius: `rounded-xl` (12px)
- Manter font stack e dark theme existentes

### Ficheiros a alterar
- `src/components/funnels/vertical-tabs/VerticalStatsTab.tsx` (reescrita)
- `src/components/funnels/stats/statsHelpers.ts` (novo)
- `src/components/funnels/stats/StatsOverviewTab.tsx` (novo)
- `src/components/funnels/stats/StatsTrendsTab.tsx` (novo)
- `src/components/funnels/stats/StatsSourcesTab.tsx` (novo)
- `src/components/funnels/stats/StatsSectionsTab.tsx` (novo)
- `src/components/funnels/stats/StatsGeoDeviceTab.tsx` (novo)
- `src/components/funnels/stats/StatsTimelineTab.tsx` (novo)

