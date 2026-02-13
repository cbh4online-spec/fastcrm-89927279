

# P2-5: Metricas Visuais de Flow Analytics

## Contexto

A tabela `flow_analytics` ja e populada pelo `flow-engine` com dados diarios por fluxo: sessoes iniciadas, completadas, abandonadas, handoffs, objetivos alcancados, duracao media, e valor de conversao. Nao existe nenhuma UI para visualizar estes dados.

## O que sera implementado

### 1. Hook `useFlowAnalytics`

Novo hook em `src/hooks/useFlowAnalytics.ts` que:
- Busca dados de `flow_analytics` filtrados por workspace e opcionalmente por flow_id
- Suporta filtro de periodo (7d, 30d, 90d)
- Calcula totais agregados (soma de sessoes, media de duracao, etc.)

### 2. Componente `FlowAnalyticsPanel`

Novo componente em `src/components/flow-builder/FlowAnalyticsPanel.tsx` com:
- **4 KPI cards no topo**: Sessoes iniciadas, Taxa de conclusao (%), Goals alcancados, Duracao media
- **Grafico de area/barras** (recharts): Sessoes por dia (started vs completed vs abandoned) nos ultimos 30 dias
- **Grafico de pie/donut**: Distribuicao de resultados (completed / abandoned / handed_off)
- **Seletor de periodo**: 7d / 30d / 90d
- Estado vazio quando nao ha dados

### 3. Integracao no FlowBuilderModule

- Adicionar um botao/tab "Analytics" no header do flow selecionado
- Quando ativo, mostra o `FlowAnalyticsPanel` em vez do canvas
- Toggle simples entre "Canvas" e "Analytics"

## Plano Tecnico

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useFlowAnalytics.ts` | **Novo** - Hook com query + agregacao |
| `src/components/flow-builder/FlowAnalyticsPanel.tsx` | **Novo** - Dashboard visual com recharts |
| `src/components/flow-builder/FlowBuilderModule.tsx` | **Editar** - Adicionar toggle Canvas/Analytics |

### Hook useFlowAnalytics

```text
Query: SELECT * FROM flow_analytics
  WHERE workspace_id = ? AND flow_id = ?
  AND date >= (now() - interval '30 days')
  ORDER BY date ASC

Retorna:
- dailyData: array para o grafico
- totals: { started, completed, abandoned, handedOff, goals, avgDuration, conversionValue }
- completionRate: (completed / started) * 100
```

### FlowAnalyticsPanel

- Usa `recharts` (ja instalado) para graficos
- `AreaChart` para tendencia diaria de sessoes
- `PieChart` para distribuicao de outcomes
- Cards KPI com icones lucide
- Filtro de periodo com 3 botoes (7d/30d/90d)
- Layout responsivo em grid

### Alteracao no FlowBuilderModule

- Adicionar estado `activeView: 'canvas' | 'analytics'`
- No header do flow (linha 132-142), adicionar dois botoes: "Canvas" e "Analytics"
- Renderizar condicionalmente `FlowBuilderCanvas` ou `FlowAnalyticsPanel`

## Sem alteracoes de DB

A tabela `flow_analytics` ja existe com todas as colunas necessarias e e populada pelo `flow-engine`.

