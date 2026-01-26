
# Plano: Simplificar Coach de Produtividade

## Resumo da Mudança
Separar claramente as responsabilidades entre os dois módulos:

**Coach de Produtividade** (simplificar):
- Definição e acompanhamento de metas pessoais/equipa
- Insights e conselhos da IA para atingir as metas
- Prioridades diárias com sugestões inteligentes
- Progresso manual ou indicativo simples

**Relatórios** (onde ficam os KPIs detalhados):
- KPIs de gestão (individual, equipa, empresa)
- Gráficos de evolução temporal
- Análise de performance histórica
- Métricas de vendas, faturação, conversão

---

## O Que Será Removido do Coach

### 1. Remover Cálculos Automáticos Complexos
**Ficheiros a eliminar:**
- `src/hooks/useGoalProgressCalculation.ts` - Hook que faz queries à BD para calcular progresso
- `src/hooks/useGoalHistoricalProgress.ts` - Hook que busca dados históricos para sparklines
- `src/components/productivity/GoalSparkline.tsx` - Componente de gráfico sparkline

### 2. Simplificar PeriodSummary
**Ficheiro:** `src/components/productivity/PeriodSummary.tsx`
- Manter apenas contagem simples de metas concluídas vs total
- Remover agregação automática de valores calculados
- Usar apenas o `current_value` manual das metas

### 3. Simplificar GoalsManager
**Ficheiro:** `src/components/productivity/GoalsManager.tsx`
- Remover imports dos hooks de cálculo automático
- Remover lógica de `autoProgressMap`
- Manter progresso baseado em `current_value` (entrada manual)
- Adicionar botão para actualizar progresso manualmente

---

## O Que Será Mantido/Melhorado

### No Coach de Produtividade

1. **Definição de Metas**
   - Períodos: diário, semanal, mensal, trimestral, semestral, anual
   - Unidades: leads, oportunidades, propostas, vendas, etc.
   - Metas individuais e organizacionais

2. **Progresso Manual**
   - Campo para actualizar valor actual da meta
   - Indicador visual de progresso (barra)
   - Status: não iniciada, em progresso, concluída, falhada

3. **Coach IA (DailyCoachPanel)**
   - Prioridades diárias sugeridas pela IA
   - Análise de metas com insights
   - Motivação e conselhos personalizados

4. **Resumo de Período (simplificado)**
   - X de Y metas concluídas
   - Progresso geral em percentagem
   - Sem breakdown por unidade automatizado

---

## Nova Funcionalidade para Relatórios (futuro)

Para não perder a funcionalidade de ver "Metas vs Resultados Reais", sugerimos criar posteriormente um novo relatório:

**Página:** `/dashboard/reports/goals` ou `/dashboard/reports/kpis`
- Comparar metas definidas com dados reais da BD
- Gráficos de evolução temporal (sparklines)
- KPIs por período e por membro
- Análise de performance individual vs equipa

---

## Detalhes Técnicos

### Passo 1: Eliminar Ficheiros
```text
src/hooks/useGoalProgressCalculation.ts (eliminar)
src/hooks/useGoalHistoricalProgress.ts (eliminar)
src/components/productivity/GoalSparkline.tsx (eliminar)
```

### Passo 2: Simplificar PeriodSummary.tsx
O componente passará a usar apenas dados manuais:

```typescript
// Antes (com cálculo automático)
const currentValue = autoProgress?.isAutomatic 
  ? autoProgress.calculatedValue 
  : (goal.current_value || 0);

// Depois (apenas manual)
const currentValue = goal.current_value || 0;
```

Interface simplificada:
```typescript
interface PeriodSummaryProps {
  goals: ProductivityGoal[];
  // Remover autoProgressMap
}
```

### Passo 3: Simplificar GoalsManager.tsx
Remover:
- Import de `useGoalsProgress`, `isAutoCalculatedUnit`, `getUnitDataSource`
- Import de `useGoalsHistoricalProgress`, `supportsHistoricalData`
- Import de `GoalSparkline`
- Toda a lógica de `autoProgressMap` e `historicalDataMap`
- Renderização do `GoalSparkline` nos cards

Adicionar:
- Botão/input para actualizar `current_value` manualmente em cada GoalCard
- Modal de edição de progresso mais acessível

### Passo 4: Actualizar GoalCard
O card de meta ficará mais simples:

```text
┌─────────────────────────────────────────┐
│ 🎯 Fechar 5 Vendas                      │
│ Meta Semanal | Individual               │
│                                         │
│ Progresso: 3 / 5 vendas                 │
│ [████████████░░░░░░░░] 60%              │
│                                         │
│ [Actualizar Progresso]  [Editar] [🗑️]  │
└─────────────────────────────────────────┘
```

---

## Impacto

### Vantagens
- Coach focado no essencial: metas + coaching IA
- Separação clara de responsabilidades
- Menos queries à BD no módulo de produtividade
- Relatórios serão a "fonte de verdade" para métricas

### Considerações
- O utilizador terá de actualizar progresso manualmente (ou criar um relatório futuro que compare automaticamente)
- A funcionalidade de ver "resultados reais vs metas" poderá ser adicionada ao módulo de Relatórios

---

## Sequência de Implementação

1. Eliminar ficheiros de cálculo automático
2. Actualizar `PeriodSummary.tsx` para usar apenas dados manuais
3. Simplificar `GoalsManager.tsx` removendo lógica automática
4. Melhorar UX de actualização manual de progresso nos GoalCards
5. Testar fluxo completo
