

# Reorganizar Performance vs Métricas & Metas

## Diagnóstico

Existem **dois sistemas de metas a funcionar em paralelo**, com sobreposição confusa:

### Sistema 1: "Metas de Performance" (`/dashboard/performance/goals`)
- Tabela: `performance_goals`
- Hook: `usePerformanceGoals` + `useGoalProgress`
- Tipos fixos: revenue, leads, proposals, deals, meetings, pipeline
- Progresso calculado em tempo real via queries diretas às tabelas fonte
- Página dedicada com cards, status, projeções

### Sistema 2: "Métricas & Metas" (`/dashboard/performance/metrics`)
- Tabelas: `pipeline_metrics` + `pipeline_metric_targets` + `pipeline_metric_alerts`
- Hook: `usePipelineMetrics`
- Métricas customizáveis (fórmula, fonte, filtros avançados)
- Metas ligadas a métricas com pipeline/stage/team scoping
- Alertas configuráveis
- Sugestões IA
- Página monolítica de 905 linhas com 3 tabs

### Sistema 3 (legado): `performance_targets`
- Usado pelo Weekly Dashboard para metas semanais simples (metric_type + target_value)
- Também usado pelo `useWorkspaceMetricSettings` para configurações de conversão

### Problemas concretos
1. **Duas páginas de "Metas"** com dados diferentes e sem ligação entre si
2. **Navegação confusa**: sidebar mostra "Metas" (goals) mas não mostra "Métricas & Metas" (metrics) — esta última só é acessível via botão "Gerir Métricas" no dashboard
3. **3 tabelas de metas** (`performance_goals`, `pipeline_metric_targets`, `performance_targets`) sem relação
4. **PipelineMetricsPage** é um ficheiro monolítico de 905 linhas misturando métricas, metas e alertas
5. O dashboard de Performance mostra "Active Goals" do sistema 1, e "MetricWidgets" do sistema 2, lado a lado sem contexto

## Solução proposta

Unificar a experiência numa **única página de Métricas, Metas & Alertas** e eliminar a duplicação.

### Decisões de produto
- **Manter** o sistema 2 (pipeline_metrics) como sistema primário — é mais flexível e extensível
- **Absorver** os presets do sistema 1 (revenue, leads, etc.) como métricas pré-configuradas no sistema 2
- **Não tocar** no sistema 3 (performance_targets) — é específico do Weekly Dashboard
- **Remover** a página `/performance/goals` como página separada
- **Integrar** as metas na página de Métricas & Metas, tornando-a o ponto único de gestão

### Alterações

| Ficheiro | Acção |
|---|---|
| `src/pages/performance/PipelineMetricsPage.tsx` | Refactorizar: extrair cada tab para componente próprio; adicionar tab "Metas Rápidas" com os presets do sistema 1; renomear para "Centro de Métricas" |
| `src/components/performance/metrics/MetricsTab.tsx` | Novo — extrair lógica do tab Métricas |
| `src/components/performance/metrics/TargetsTab.tsx` | Novo — extrair lógica do tab Metas |
| `src/components/performance/metrics/AlertsTab.tsx` | Novo — extrair lógica do tab Alertas |
| `src/components/performance/metrics/GoalPresetsTab.tsx` | Novo — absorver os presets de PerformanceGoalsPage com cards de progresso |
| `src/pages/performance/PerformanceDashboardPage.tsx` | Substituir secção "Active Goals" para usar dados unificados; link "Gerir" aponta para a mesma página |
| `src/routes/PerformanceRoutes.tsx` | Remover rota `/performance/goals`; redirecionar para `/performance/metrics` |
| `src/config/nav.v1.ts` | Substituir "Metas" por "Métricas & Metas" apontando para `/performance/metrics` |
| `src/config/nav.v2.ts` | Idem |
| `src/config/routeManifest.ts` | Remover entrada `perf-goals`, tornar `perf-metrics` visível no sidebar |

### Estrutura final do módulo Performance no sidebar

```text
Performance
├── Dashboard
├── Métricas & Metas    ← unificado (4 tabs: Métricas, Metas, Alertas, Objetivos)
├── Leaderboard
├── Desafios
├── Reconhecimentos
├── TV Mode
└── Configurações
```

### Tab "Objetivos" (ex-Goals)
- Usa os mesmos presets (revenue, leads, proposals, etc.) do `useGoalProgress`
- Mostra cards com progresso em tempo real, projeções e status
- Dados continuam em `performance_goals` (não se elimina a tabela)
- Mas a página separada desaparece — fica integrada como tab

## Critérios de aceitação
- Página única `/performance/metrics` com 4 tabs claros
- Ficheiro monolítico partido em 4 componentes (~200 linhas cada)
- Navegação sem duplicação: "Métricas & Metas" no sidebar, sem "Metas" separado
- Dashboard de Performance referencia dados unificados
- Zero regressões no Weekly Dashboard (performance_targets intocado)

## Riscos
- Links directos a `/performance/goals` precisam de redirect
- Hooks `usePerformanceGoals` e `useGoalProgress` mantêm-se mas ficam encapsulados no tab "Objetivos"

