

# Plano: Adicionar Períodos Trimestrais e Semestrais às Metas

## Objetivo
Adicionar dois novos períodos de metas: **Trimestral** (3 meses) e **Semestral** (6 meses), permitindo uma gestão mais completa de objetivos a médio prazo.

---

## Alterações Necessárias

### 1. Base de Dados (Migração)

Atualizar o ENUM `goal_period` para incluir os novos valores:

```text
ALTER TYPE public.goal_period ADD VALUE 'quarterly';
ALTER TYPE public.goal_period ADD VALUE 'semiannual';
```

**Nota**: Em PostgreSQL, não é possível remover valores de ENUMs, apenas adicionar - o que é seguro para dados existentes.

---

### 2. Hook de Produtividade

**Ficheiro**: `src/hooks/useProductivityCoach.ts`

Atualizar a linha 8:
```text
Antes: export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'annual';
Depois: export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
```

---

### 3. Componente GoalsManager

**Ficheiro**: `src/components/productivity/GoalsManager.tsx`

#### Importar ícones adicionais
Adicionar ícones apropriados (ex: `CalendarRange` ou `CalendarDays`).

#### Atualizar PERIOD_CONFIG (linhas 129-134)
```text
Antes:
PERIOD_CONFIG = {
  daily: { label: 'Diária', icon: Zap },
  weekly: { label: 'Semanal', icon: TrendingUp },
  monthly: { label: 'Mensal', icon: Target },
  annual: { label: 'Anual', icon: Trophy },
}

Depois:
PERIOD_CONFIG = {
  daily: { label: 'Diária', icon: Zap },
  weekly: { label: 'Semanal', icon: TrendingUp },
  monthly: { label: 'Mensal', icon: Target },
  quarterly: { label: 'Trimestral', icon: CalendarRange },
  semiannual: { label: 'Semestral', icon: CalendarDays },
  annual: { label: 'Anual', icon: Trophy },
}
```

#### Atualizar função getPeriodDates (linhas 162-174)
Adicionar lógica para calcular datas de início/fim para trimestre e semestre:

```text
case 'quarterly':
  // Determina o trimestre atual (Q1: Jan-Mar, Q2: Abr-Jun, etc.)
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
  return { start: quarterStart, end: quarterEnd };

case 'semiannual':
  // Determina o semestre atual (S1: Jan-Jun, S2: Jul-Dez)
  const semesterStart = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
  const semesterEnd = new Date(semesterStart.getFullYear(), semesterStart.getMonth() + 6, 0);
  return { start: semesterStart, end: semesterEnd };
```

---

### 4. Atualizar Tabs de Filtro de Período

Na secção de tabs de período (linhas ~555-570), os novos períodos aparecerão automaticamente porque o código itera sobre `Object.entries(PERIOD_CONFIG)`.

---

## Resumo das Mudanças

| Ficheiro | Alteração |
|----------|-----------|
| Migração SQL | Adicionar valores ao ENUM `goal_period` |
| `useProductivityCoach.ts` | Atualizar tipo `GoalPeriod` |
| `GoalsManager.tsx` | Adicionar configuração visual e lógica de datas |

---

## Resultado Final

O seletor de período no modal "Criar Nova Meta" e os filtros de período incluirão:

- Diária
- Semanal
- Mensal
- **Trimestral** (novo)
- **Semestral** (novo)
- Anual

