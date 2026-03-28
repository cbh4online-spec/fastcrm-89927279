

# Metas de Performance — Ligação aos Módulos Reais

## Problema

As metas estão completamente desligadas dos dados reais do CRM. O progresso é sempre "0" porque não há cálculo automático a partir de leads, oportunidades, propostas ou receita. O formulário é genérico — pede apenas um nome e valor alvo sem indicar a que módulo se refere.

## Solução

Transformar as metas num sistema que se liga automaticamente aos dados reais do sistema.

### 1. Presets de Tipo de Meta (em vez de formulário genérico)

Ao criar uma meta, o utilizador escolhe de um grid visual:

| Preset | Ícone | Fonte de Dados | Unidade |
|---|---|---|---|
| Faturação | TrendingUp | `opportunities` (won, amount) | € |
| Leads Captados | Users | `leads` (count, created_at) | nº |
| Propostas Enviadas | FileText | `proposals` (count, created_at) | nº |
| Negócios Fechados | Handshake | `opportunities` (won, count) | nº |
| Reuniões | Calendar | `meetings` (count) | nº |
| Pipeline | BarChart3 | `opportunities` (open, amount) | € |

Ao selecionar o preset, os campos "fonte" e "unidade" preenchem automaticamente — o utilizador só define o valor alvo e o período.

### 2. Cálculo de Progresso Real

Criar hook `useGoalProgress(goal)` que, com base no `goal_type`/`entity_source`:
- Consulta a tabela real (leads, opportunities, proposals, meetings)
- Filtra por `workspace_id`, `period_start` ≤ `created_at` ≤ `period_end`
- Para revenue: soma `amount` das opportunities com `status = 'won'`
- Para leads: conta registos criados no período
- Para propostas: conta propostas criadas
- Retorna `{ current_value, percentage, status }` onde status = on_track/at_risk/behind/exceeded

### 3. Cards Redesenhados

Cada card de meta mostrará:
- Ícone e label do tipo (ex: "📊 Faturação")
- Badge colorido do estado (verde = on_track, amarelo = at_risk, vermelho = behind, azul = exceeded)
- Barra de progresso real com `current / target` e percentagem
- Progresso temporal (dias passados vs total)
- Projeção: "A este ritmo, atingirá X no final do período"

### 4. KPI Selector no Formulário

Ligar o campo `kpi_id` existente na BD à tabela `performance_kpis`:
- Mostrar KPIs disponíveis como opção avançada
- Permitir criar metas custom ligadas a KPIs específicos

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/hooks/usePerformanceGoals.ts` | Adicionar `useGoalProgress` hook com queries reais |
| `src/pages/performance/PerformanceGoalsPage.tsx` | Reescrever com presets, cards ricos, progresso real |
| `src/hooks/usePerformanceGoals.ts` | Adicionar lógica de projeção e estado automático |

