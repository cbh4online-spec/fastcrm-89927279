

# Plano: Histórico de 4 Semanas — Metas vs Atingido

Criar uma secção com gráficos que mostram a evolução das últimas 4 semanas, comparando metas definidas com valores reais atingidos.

---

## Dados disponíveis

A tabela `performance_targets` já armazena `metric_type`, `target_value`, `period_start`, `period_end` por semana. Os actuals vêm das mesmas queries que o `useWeeklyPerformance` já faz (leads, meetings, proposals, opportunities), mas parametrizadas para cada uma das 4 semanas.

---

## Implementação

### 1. Hook `useWeeklyHistory`
- Calcula os bounds (segunda→domingo) das últimas 4 semanas
- Para cada semana, faz queries paralelas:
  - `performance_targets` → metas definidas
  - `leads`, `meetings`, `calendar_events`, `proposals`, `opportunities` → contagens reais
- Retorna array de 4 objectos: `{ weekLabel, metrics: { revenue: { target, actual }, leads: { target, actual }, ... } }`

### 2. Componente `WeeklyHistoryCharts`
- Usa Recharts (já instalado no projecto)
- **Gráfico de barras agrupadas** (target vs actual) por semana para cada métrica
- Layout: grid 2×2 ou 3×2 com mini-gráficos para Revenue, Leads, Reuniões, Proposals, Deals
- Barras verde (atingido) e cinza tracejado (meta)
- Tooltip com valores exactos
- Badge de tendência (↑↓) comparando semana actual vs anterior

### 3. Integração no Dashboard
- Nova secção entre o "Oportunidades e Ações" e "Metas do Trimestre"
- Título: "Evolução Semanal" com ícone `BarChart3`
- Substitui o placeholder `TrendCompositionSection` existente

---

## Detalhe técnico

```text
┌──────────────────────────────────────────┐
│  Evolução Semanal (últimas 4 semanas)    │
├──────────┬──────────┬──────────┬─────────┤
│ Receita  │ Leads    │ Reuniões │ Deals   │
│ ██ ░░    │ ██ ░░    │ ██ ░░    │ ██ ░░   │
│ ██ ██    │ ██ ░░    │ ██ ██    │ ██ ██   │
│ ██ ██    │ ██ ██    │ ██ ██    │ ██ ██   │
│ ██ ██    │ ██ ██    │ ██ ██    │ ██ ██   │
│ S1 S2 S3 S4         (semanas)            │
└──────────────────────────────────────────┘
█ = Atingido   ░ = Meta
```

- Cada mini-chart mostra 4 barras duplas (meta vs actual)
- Cores: `hsl(var(--primary))` para actual, `hsl(var(--muted))` para target
- Semanas sem metas definidas mostram apenas a barra de actual
- Formato currency para receita, número para os restantes

