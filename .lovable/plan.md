

# Alertas com Ajuda da IA

## Diagnóstico

O tab de Alertas tem apenas criação manual. O tab de Métricas já tem "Sugerir com IA" que chama a edge function `context-ai-assist` com action `suggest_metrics_and_targets`. Falta o equivalente para alertas.

## Solução

### 1. Edge Function — nova action `suggest_alerts`

Adicionar ao `context-ai-assist/index.ts` um novo bloco `if (action === "suggest_alerts")` que:
- Busca métricas e metas existentes do workspace
- Busca contexto estratégico dos `context_blocks`
- Pede à IA para sugerir alertas relevantes (condição, threshold, canal, métrica associada)
- Retorna array de sugestões com `metric_id`, `condition`, `threshold_pct`, `channel`, `reasoning`

### 2. Frontend — botão "Sugerir com IA" no tab Alertas

No `PipelineMetricsPage.tsx`:
- Adicionar botão "Sugerir com IA" ao lado do "Novo Alerta" (mesmo padrão do tab Métricas)
- Estado para `aiAlertSuggestions`, `aiAlertLoading`, `aiAlertOpen`
- Dialog com lista de sugestões, cada uma com botão "Adicionar" que chama `createAlert.mutate`
- Cada sugestão mostra: métrica, condição, threshold, canal, e reasoning da IA

## Ficheiros

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/context-ai-assist/index.ts` | Nova action `suggest_alerts` com prompt contextual |
| `src/pages/performance/PipelineMetricsPage.tsx` | Botão IA + dialog de sugestões no tab Alertas |

## Fluxo

1. Utilizador clica "Sugerir com IA" no tab Alertas
2. Frontend chama edge function com `action: "suggest_alerts"`
3. IA analisa métricas, metas e contexto do negócio
4. Retorna 3-5 alertas sugeridos com reasoning
5. Utilizador revê e aceita os que quiser com um clique

## Critérios de aceitação

- Botão "Sugerir com IA" visível no tab Alertas (desactivado se não há métricas)
- Sugestões mostram métrica, condição, threshold e justificação
- Aceitar sugestão cria o alerta imediatamente
- Loading state e tratamento de erros consistentes com o padrão existente

