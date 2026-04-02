

# Corrigir Propagação Automática de Metas Semanais

## Problema

As metas (`performance_targets`) são criadas manualmente e não se replicam para semanas futuras. A semana atual (30/3-05/4) não tem targets na BD — os últimos terminam a 29/3. Resultado: gráficos mostram "0% da meta" na semana corrente.

## Solução

### 1. Fallback no hook `useWeeklyHistory.ts`
Quando não existirem targets para uma semana, usar os targets da semana anterior mais recente como fallback. Isto garante que os gráficos nunca ficam sem referência de meta.

### 2. Fallback no hook `useWeeklyPerformance.ts`
Mesma lógica: se não há targets para a semana corrente, buscar os mais recentes anteriores.

### 3. (Opcional) Auto-propagação de targets
Adicionar lógica no `useWeeklyPerformance` ou num componente dedicado que, ao detetar ausência de targets para a semana corrente, crie automaticamente novos registos copiando os valores da semana anterior.

## Abordagem técnica

Nos dois hooks, alterar a query de targets para:
1. Tentar buscar targets da semana exata (comportamento atual)
2. Se não encontrar, fazer uma segunda query: `ORDER BY period_end DESC LIMIT 1` por `metric_type` para obter os targets mais recentes

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useWeeklyHistory.ts` | Fallback para targets da semana anterior quando não existem para a semana consultada |
| `src/hooks/useWeeklyPerformance.ts` | Fallback para targets da semana anterior quando não existem para a semana corrente |

