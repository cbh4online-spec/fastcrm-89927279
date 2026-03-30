

## Dashboard de Métricas de Recuperação — Plano

### Diagnóstico

A tabela `store_abandoned_carts` já contém todos os dados necessários: `recovery_status`, `subtotal`, `recovered_value`, `abandoned_at`, `recovered_at`, `sequence_id`, `outreach_status`. Existe um hook `useAbandonedCartStats` básico em `useStoreAutomation.ts` mas sem dados temporais nem breakdown por sequência. A página actual (`AbandonedCartsPage`) é apenas uma lista sem gráficos.

### Plano

#### 1. Criar hook `useRecoveryMetrics` (`src/hooks/useRecoveryMetrics.ts`)

Queries à tabela `store_abandoned_carts` (read-only, sem migration):

- **Taxa de recuperação ao longo do tempo**: agrupa por mês/semana via `abandoned_at`, calcula recovered/total por período
- **Valor recuperado ao longo do tempo**: soma `recovered_value` (ou `subtotal` dos recovered) por período
- **Performance por sequência**: agrupa por `sequence_id`, JOIN com `email_sequences` para nome, calcula taxa e valor por sequência

#### 2. Criar página `RecoveryMetricsPage` (`src/pages/dashboard/checkout/RecoveryMetricsPage.tsx`)

Rota: `/dashboard/checkout/recovery-metrics`

Conteúdo:
- **KPI cards** (topo): total abandonados, total recuperados, taxa global, valor total recuperado
- **Gráfico 1** — Taxa de recuperação ao longo do tempo (AreaChart, eixo Y %, eixo X mês)
- **Gráfico 2** — Valor recuperado ao longo do tempo (AreaChart, eixo Y €, eixo X mês)
- **Gráfico 3** — Performance por sequência (BarChart horizontal: nome da sequência vs taxa + valor)
- Filtro de período (últimos 30/60/90 dias)
- Estado vazio, loading

Usar Recharts (já disponível), padrão visual dos charts existentes (`SystemMetricsPanel`).

#### 3. Adicionar rota em `CheckoutRoutes.tsx`

Lazy import + rota `/dashboard/checkout/recovery-metrics`.

---

### Ficheiros

| Acção | Ficheiro |
|-------|----------|
| Criar | `src/hooks/useRecoveryMetrics.ts` |
| Criar | `src/pages/dashboard/checkout/RecoveryMetricsPage.tsx` |
| Editar | `src/routes/CheckoutRoutes.tsx` |

Sem migrations — dados já existem em `store_abandoned_carts`.

