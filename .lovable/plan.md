

# Corrigir Tabela de Uso de IA no Super Admin

## Diagnóstico

A tabela mostra tudo a zeros porque consulta as fontes de dados erradas:

| O que faz (errado) | O que deveria fazer (correcto) |
|---|---|
| Lê `workspace_usage.ai_calls_used` → tabela vazia (0 registos) | Ler `workspace_plans.calls_used` e `workspace_plans.calls_included` → 10 registos activos com dados reais |
| Lê `workspace_subscriptions.plan` para o nome do plano | Ler `workspace_plans.plan` (fonte de verdade) |
| Lê `plan_features.ai_calls_limit` para limites | Usar `workspace_plans.calls_included` directamente (já tem o limite por workspace) |

**Dados reais existentes**: 5.863 registos em `ai_call_log`, 10 `workspace_plans` activos (ex: METODOPARE com 5.598/10.000 calls usados).

## Alteração

| Ficheiro | Acção |
|---|---|
| `src/components/super-admin/AIUsageSection.tsx` | Reescrever a query para usar `workspace_plans` em vez de `workspace_usage` + `plan_features` |

### Detalhe técnico

Substituir a query actual por:

1. **Buscar todos os workspaces** com join a `workspace_plans` (filtro `status = active`):
   ```
   workspaces → id, name
   workspace_plans → plan, calls_used, calls_included, cycle_start, cycle_end
   ```

2. **Para workspaces sem plano activo** (Free): mostrar `0 / 0` com plano "free"

3. **Calcular percentage** a partir de `calls_used / calls_included` (já calculado correctamente na lógica existente, só muda a fonte)

4. **Manter toda a lógica existente** de badges, filtros, abuse detection e limit dialog — apenas mudar de onde vêm os números

5. **Adicionar coluna `Ciclo`** com a data de fim do ciclo para contexto adicional

### Resultado esperado

- METODOPARE: 5.598 / 10.000 (56%) — Pro
- Blecksen: 41 / 10.000 — Pro  
- Workspaces Free: 0 / 0 — Free
- KPIs do header com valores reais

