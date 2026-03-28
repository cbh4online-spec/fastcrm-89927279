

# Fix: Métricas & Metas — Sidebar e Atalho no Menu

## Problema
A página `/dashboard/performance/metrics` (PipelineMetricsPage) tem dois problemas:
1. **Sem sidebar** — não está envolvida em `DashboardLayout`, ao contrário de todas as outras páginas do dashboard
2. **Sem atalho no menu** — não existe entrada no `routeManifest.ts`, por isso não aparece na navegação lateral

## Correções

### 1. Envolver em DashboardLayout
Adicionar `DashboardLayout` ao `PipelineMetricsPage.tsx` — importar e envolver o conteúdo existente.

### 2. Adicionar ao Route Manifest
Adicionar entrada em `routeManifest.ts` no grupo "vendas", junto às outras rotas de performance:
- Key: `"perf-metrics"`
- Label: `"Métricas & Metas"`
- Path: `/dashboard/performance/metrics`
- Ícone: `BarChart3` (já importado)
- Visível no sidebar

| Ficheiro | Mudança |
|---|---|
| `src/pages/performance/PipelineMetricsPage.tsx` | Envolver em `DashboardLayout` |
| `src/config/routeManifest.ts` | Adicionar entrada para métricas |

