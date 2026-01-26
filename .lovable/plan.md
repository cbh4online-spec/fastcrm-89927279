
# Plano: Relatório de Metas vs Resultados

## Objetivo
Criar uma nova pagina no modulo de Relatorios que compare automaticamente as metas definidas no Coach de Produtividade com os dados reais da base de dados, mantendo a separacao clara de responsabilidades entre modulos.

---

## Arquitectura da Solucao

```text
+----------------------------------+       +----------------------------------+
|   COACH DE PRODUTIVIDADE         |       |   RELATORIOS > METAS             |
|   (Manual + Coaching)            |       |   (Dados Automaticos)            |
+----------------------------------+       +----------------------------------+
|  - Definir metas                 |       |  - Ver progresso real da BD      |
|  - Actualizar current_value      |  -->  |  - Sparklines de evolucao        |
|  - Prioridades diarias           |       |  - Comparacao meta vs resultado  |
|  - Insights IA motivacionais     |       |  - KPIs por periodo/membro       |
+----------------------------------+       +----------------------------------+
```

---

## O Que Sera Criado

### 1. Nova Pagina de Relatorio
**Rota:** `/dashboard/reports/goals`
**Ficheiro:** `src/pages/ReportsGoals.tsx`

Esta pagina ira:
- Listar todas as metas definidas no Coach de Produtividade
- Para cada meta, buscar os dados reais da BD (vendas, leads, propostas, etc.)
- Mostrar comparacao visual entre meta vs resultado actual

### 2. Hook de Calculo Automatico
**Ficheiro:** `src/hooks/useGoalsVsResults.ts`

Este hook ira:
- Buscar metas da tabela `productivity_goals`
- Para cada meta, calcular o progresso real baseado na unidade:
  - `vendas` / `sales` -> Oportunidades com status "won" no periodo
  - `leads` -> Leads criados no periodo
  - `oportunidades` / `opportunities` -> Oportunidades criadas no periodo
  - `propostas` / `proposals` -> Propostas criadas no periodo
  - `reunioes` / `meetings` -> Reunioes realizadas no periodo
  - `tarefas` / `tasks` -> Tarefas concluidas no periodo
  - `facturacao` / `revenue` -> Soma dos valores das oportunidades ganhas
- Calcular percentagem de progresso e status (on_track, at_risk, behind, ahead)
- Gerar dados historicos para sparklines

### 3. Componente Principal do Relatorio
**Ficheiro:** `src/components/reports/GoalsVsResultsReport.tsx`

Layout:
```text
+----------------------------------------------------------+
| Relatorio: Metas vs Resultados                           |
| [Periodo: v] [Membro: v] [Scope: v]        [Atualizar]   |
+----------------------------------------------------------+
| KPIs Resumo                                              |
| +------------+ +------------+ +------------+ +----------+ |
| | X/Y Metas  | | X% Global  | | X Atras    | | X Acima  | |
| | Concluidas | | Progresso  | | Schedule   | | Schedule | |
| +------------+ +------------+ +------------+ +----------+ |
+----------------------------------------------------------+
| Metas por Periodo                                        |
| +------------------------------------------------------+ |
| | Diarias (2)                                          | |
| | +--------------------------------------------------+ | |
| | | Meta: 5 Chamadas | Real: 7 | +40% | [Sparkline]  | | |
| | +--------------------------------------------------+ | |
| | | Meta: 2 Reunioes | Real: 1 | -50% | [Sparkline]  | | |
| | +--------------------------------------------------+ | |
| +------------------------------------------------------+ |
| +------------------------------------------------------+ |
| | Semanais (3)                                         | |
| | ...                                                  | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### 4. Componente de Sparkline para Evolucao
**Ficheiro:** `src/components/reports/GoalProgressSparkline.tsx`

Reutiliza a logica removida do Coach, mas agora no contexto correcto:
- Grafico de area mostrando evolucao diaria
- Linha de referencia para o target
- Tooltip com detalhes

---

## Detalhes Tecnicos

### Passo 1: Criar o Hook de Dados
```typescript
// src/hooks/useGoalsVsResults.ts

interface GoalWithRealProgress {
  goal: ProductivityGoal;
  realValue: number;           // Valor calculado da BD
  manualValue: number;         // current_value da meta
  targetValue: number;         // target_value da meta
  realProgress: number;        // Percentagem real
  status: 'on_track' | 'at_risk' | 'behind' | 'ahead';
  historicalData: { date: string; value: number }[];
}

// Mapear unidades para queries
const UNIT_TO_QUERY = {
  'vendas': { table: 'opportunities', filter: { status: 'won' }, valueField: null },
  'sales': { table: 'opportunities', filter: { status: 'won' }, valueField: null },
  'leads': { table: 'leads', filter: {}, valueField: null },
  'oportunidades': { table: 'opportunities', filter: {}, valueField: null },
  'propostas': { table: 'proposals', filter: {}, valueField: null },
  'reunioes': { table: 'meetings', filter: { status: 'completed' }, valueField: null },
  'tarefas': { table: 'tasks', filter: { status: 'done' }, valueField: null },
  'facturacao': { table: 'opportunities', filter: { status: 'won' }, valueField: 'value' },
  'revenue': { table: 'opportunities', filter: { status: 'won' }, valueField: 'value' },
};
```

### Passo 2: Criar a Pagina de Relatorio
```typescript
// src/pages/ReportsGoals.tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GoalsVsResultsReport } from "@/components/reports/GoalsVsResultsReport";

export default function ReportsGoals() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <GoalsVsResultsReport />
      </div>
    </DashboardLayout>
  );
}
```

### Passo 3: Adicionar Rota no App.tsx
```typescript
// Adicionar import
import ReportsGoals from "./pages/ReportsGoals";

// Adicionar rota
<Route path="/dashboard/reports/goals" element={<ReportsGoals />} />
```

### Passo 4: Adicionar Link na Navegacao
Actualizar a sidebar/navegacao de Relatorios para incluir "Metas vs Resultados"

---

## Filtros Disponiveis

O relatorio tera os seguintes filtros:
- **Periodo**: Diario, Semanal, Mensal, Trimestral, Semestral, Anual, Todos
- **Membro**: Todos, ou membro especifico (para admins)
- **Scope**: Individual, Organizacional, Todos

---

## Calculo de Status

```typescript
function calculateStatus(realProgress: number, daysRemaining: number, totalDays: number): Status {
  const expectedProgress = ((totalDays - daysRemaining) / totalDays) * 100;
  
  if (realProgress >= 100) return 'completed';
  if (realProgress >= expectedProgress * 1.1) return 'ahead';
  if (realProgress >= expectedProgress * 0.8) return 'on_track';
  if (realProgress >= expectedProgress * 0.5) return 'at_risk';
  return 'behind';
}
```

---

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/pages/ReportsGoals.tsx` | Pagina principal do relatorio |
| `src/hooks/useGoalsVsResults.ts` | Hook para calcular progresso real |
| `src/components/reports/GoalsVsResultsReport.tsx` | Componente principal |
| `src/components/reports/GoalProgressSparkline.tsx` | Sparkline de evolucao |
| `src/components/reports/GoalComparisonCard.tsx` | Card individual de meta |

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/App.tsx` | Adicionar rota `/dashboard/reports/goals` |
| Navegacao/Sidebar | Adicionar link para novo relatorio |

---

## Beneficios

1. **Separacao Clara**: Coach foca em definir metas e coaching, Relatorios foca em dados
2. **Dados Precisos**: Calculos automaticos directamente da BD
3. **Visao Historica**: Sparklines mostram evolucao ao longo do tempo
4. **Filtragem Flexivel**: Ver por periodo, membro ou scope
5. **Comparacao Visual**: Facil de ver onde se esta a cumprir ou falhar

---

## Sequencia de Implementacao

1. Criar hook `useGoalsVsResults.ts` com logica de calculo
2. Criar componente `GoalProgressSparkline.tsx`
3. Criar componente `GoalComparisonCard.tsx`
4. Criar componente principal `GoalsVsResultsReport.tsx`
5. Criar pagina `ReportsGoals.tsx`
6. Adicionar rota no `App.tsx`
7. Actualizar navegacao para incluir link
8. Testar com diferentes tipos de metas
