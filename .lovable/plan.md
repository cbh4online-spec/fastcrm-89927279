

# Métricas de Tempo Médio e Taxa de Conversão entre Fases

## Contexto

A página de Ciclo de Vida já tem KPIs básicos (total, conversão lead→cliente, prospects activos, clientes) e o diagrama ReactFlow. Falta:
1. **Tempo médio em cada fase** — quanto tempo os contactos ficam em cada estágio
2. **Taxa de conversão entre fases adjacentes** — % de contactos que passam de uma fase para a seguinte

## Abordagem para Dados

A tabela `contact_audit_log` já regista alterações de campos com `field_name`, `old_value`, `new_value` e `changed_at`. Quando o `lifecycle_stage` é alterado, existe um registo com `field_name = 'lifecycle_stage'`. Isto permite calcular:
- **Tempo médio por fase**: diferença entre `changed_at` de entrada e saída de cada stage
- **Conversão entre fases**: contagem de transições stage A → stage B vs total que estiveram em A

Como os cálculos envolvem agregação complexa sobre audit logs, vamos criar uma **função SQL** no banco de dados para eficiência, e um novo hook para a consumir.

## Alterações

### 1. Migração SQL — Função `get_lifecycle_metrics`

Criar uma função PostgreSQL que:
- Consulta `contact_audit_log` onde `field_name = 'lifecycle_stage'`
- Calcula tempo médio em cada fase (diferença entre timestamps de entrada e saída)
- Calcula taxa de conversão entre fases adjacentes (quantos passaram de A→B / quantos estiveram em A)
- Retorna JSON com `avg_days_per_stage` e `conversion_rates`

```sql
CREATE OR REPLACE FUNCTION get_lifecycle_metrics(p_workspace_id uuid)
RETURNS jsonb AS $$
  -- Aggregates audit log transitions to compute avg time per stage
  -- and stage-to-stage conversion rates
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. `src/hooks/useCustomerLifecycle.ts` — Novo hook `useLifecycleMetrics`

- Chama `supabase.rpc('get_lifecycle_metrics', { p_workspace_id })` 
- Retorna `{ avgDaysPerStage: Record<stage, number>, conversionRates: Record<string, number> }`
- Query key: `["lifecycle-metrics", workspaceId]`

### 3. `src/components/lifecycle/LifecycleStageNode.tsx` — Mostrar tempo médio

- Adicionar prop `avgDays` ao nó
- Mostrar abaixo da contagem: ex. "~12d avg" em texto pequeno
- Se não houver dados, mostrar "—"

### 4. `src/components/lifecycle/CustomerLifecycleFlow.tsx` — Labels de conversão nas edges

- Passar `conversionRates` para os edge labels
- Cada edge entre fases mostra a % de conversão (ex. "72%") como `label` na `Edge`
- Passar `avgDaysPerStage` para os nodes via `data`

### 5. `src/components/lifecycle/LifecycleKPIs.tsx` — Novos KPIs

- Adicionar KPI "Tempo Médio Visitor → Customer" (soma dos tempos médios)
- Adicionar KPI "Taxa Média de Progressão" (média das taxas de conversão entre fases)

### 6. `src/components/lifecycle/LifecycleConversionTable.tsx` — Nova tabela (opcional)

Tabela abaixo do diagrama mostrando:

```text
| Fase           | Contactos | Tempo Médio | Conversão → Próxima |
|----------------|-----------|-------------|---------------------|
| Visitante      | 120       | 5.2 dias    | 68%                 |
| Lead           | 82        | 8.1 dias    | 45%                 |
| Prospect       | 37        | 12.3 dias   | 62%                 |
| Vendas         | 23        | 6.7 dias    | 78%                 |
| Onboarding     | 18        | 3.4 dias    | 94%                 |
| Customer       | 17        | —           | —                   |
```

### 7. `src/pages/CustomerLifecyclePage.tsx`

- Consumir `useLifecycleMetrics` e passar dados ao flow e KPIs
- Adicionar `LifecycleConversionTable` abaixo do diagrama

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Criar função `get_lifecycle_metrics` |
| `src/hooks/useCustomerLifecycle.ts` | Adicionar `useLifecycleMetrics` |
| `src/components/lifecycle/LifecycleStageNode.tsx` | Mostrar tempo médio no nó |
| `src/components/lifecycle/CustomerLifecycleFlow.tsx` | Labels de conversão nas edges + avgDays nos nodes |
| `src/components/lifecycle/LifecycleKPIs.tsx` | 2 novos KPIs |
| `src/components/lifecycle/LifecycleConversionTable.tsx` | Nova tabela de métricas |
| `src/pages/CustomerLifecyclePage.tsx` | Integrar novos dados |

