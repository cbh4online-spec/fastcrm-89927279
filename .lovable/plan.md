

# Ligar "Definir Metas" ao Módulo Métricas & Metas

## Diagnóstico

O botão "Definir Metas" no WeeklyDashboard (linha 90-98) abre o `WeeklyTargetsEditor` dialog local (`setTargetsOpen(true)`). Deveria navegar para `/dashboard/performance/metrics` — o módulo completo de Métricas & Metas.

## Solução

### `src/pages/WeeklyDashboard.tsx`

1. Adicionar `useNavigate` do react-router-dom
2. Alterar o `onClick` do botão "Definir Metas" de `() => setTargetsOpen(true)` para `() => navigate("/dashboard/performance/metrics")`
3. Remover o componente `<WeeklyTargetsEditor>` e o estado `targetsOpen` / import se já não forem usados noutro sítio

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/pages/WeeklyDashboard.tsx` | Botão navega para `/dashboard/performance/metrics`; remover WeeklyTargetsEditor e estado associado |

