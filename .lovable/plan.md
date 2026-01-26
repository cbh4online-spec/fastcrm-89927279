

# Plano: Sistema de Avaliacao Inteligente de Metas

## Objetivo
Implementar uma avaliacao mais completa para metas diarias e semanais, mostrando tanto o valor real do periodo atual como medias historicas para contexto.

---

## Estrutura de Dados Proposta

### Novos Campos no GoalWithRealProgress

```typescript
interface GoalWithRealProgress {
  // Campos existentes...
  goal: ProductivityGoal;
  realValue: number;           // Valor do periodo atual
  targetValue: number;
  realProgress: number;
  
  // NOVOS CAMPOS
  averageValue7d: number;      // Media dos ultimos 7 dias (para diarias)
  averageValue30d: number;     // Media dos ultimos 30 dias (para diarias)
  averageWeekly4w: number;     // Media das ultimas 4 semanas (para semanais)
  projectedValue: number;      // Valor projetado para fim do periodo
  projectedProgress: number;   // Progresso projetado
  trendDirection: 'up' | 'down' | 'stable';  // Tendencia
}
```

---

## Logica de Calculo por Tipo de Meta

### Metas Diarias

| Metrica | Calculo |
|---------|---------|
| Valor Real | Dados de HOJE (00:00 - 23:59) |
| Media 7 dias | Soma ultimos 7 dias / 7 |
| Media 30 dias | Soma ultimos 30 dias / 30 |
| Tendencia | Compara media 7d vs media 30d |

**Interpretacao do Status**:
- Se valor hoje >= target: **Concluida**
- Se media 7d >= target * 0.8: **No Prazo** (mesmo que hoje seja baixo)
- Se media 7d < target * 0.5: **Em Risco**

### Metas Semanais

| Metrica | Calculo |
|---------|---------|
| Valor Real | Dados de Segunda a Domingo atual |
| Media 4 semanas | Soma ultimas 4 semanas / 4 |
| Projecao | (Valor ate agora / dias passados) * 7 |
| Tendencia | Compara esta semana vs media 4 semanas |

**Exemplo Segunda-feira**:
- Meta: 2500€/semana
- Hoje (seg): 400€
- Projecao: 400€ * 7 dias = 2800€ (se mantiver ritmo)
- Status: A Caminho

---

## Alteracoes no UI

### Card de Meta com Contexto

```text
+--------------------------------------------------+
| Meta: 500€ Faturacao Diaria            [Diaria]  |
+--------------------------------------------------+
| HOJE                           CONTEXTO          |
| ┌────────────┐                 ┌───────────────┐ |
| │    0€      │                 │ Media 7d: 232€│ |
| │   (0%)     │                 │ Media 30d:189€│ |
| └────────────┘                 │ Tend: ↗ +23%  │ |
|                                └───────────────┘ |
| [==========----------] 46% media vs target       |
| Status: Normal (hoje baixo, media no prazo)      |
+--------------------------------------------------+
```

```text
+--------------------------------------------------+
| Meta: 2500€ Faturacao Semanal         [Semanal]  |
+--------------------------------------------------+
| ESTA SEMANA (3/7 dias)         PROJECAO          |
| ┌────────────┐                 ┌───────────────┐ |
| │  1200€     │                 │ Fim semana:   │ |
| │  (48%)     │                 │    2800€      │ |
| └────────────┘                 │ Media 4sem:   │ |
|                                │    2100€      │ |
|                                └───────────────┘ |
| [===========---------] 48% real | 112% projetado |
| Status: Acima do Normal ✓                        |
+--------------------------------------------------+
```

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/hooks/useGoalsVsResults.ts` | Adicionar calculos de medias e projecoes |
| `src/components/reports/GoalComparisonCard.tsx` | Mostrar novas metricas de contexto |

---

## Implementacao Tecnica

### Passo 1: Novas Funcoes de Calculo

```typescript
// Calcular media diaria dos ultimos N dias
async function calculateDailyAverage(
  category: UnitCategory,
  workspaceId: string,
  days: number,
  userId: string | null
): Promise<number> {
  const today = new Date();
  const startDate = subDays(today, days);
  
  const totalValue = await fetchUnitValue(
    category, workspaceId,
    format(startDate, 'yyyy-MM-dd'),
    format(today, 'yyyy-MM-dd'),
    userId
  );
  
  return totalValue / days;
}

// Calcular media semanal das ultimas N semanas
async function calculateWeeklyAverage(
  category: UnitCategory,
  workspaceId: string,
  weeks: number,
  userId: string | null
): Promise<number> {
  const today = new Date();
  const startDate = subWeeks(today, weeks);
  
  const totalValue = await fetchUnitValue(
    category, workspaceId,
    format(startOfWeek(startDate), 'yyyy-MM-dd'),
    format(endOfWeek(subWeeks(today, 1)), 'yyyy-MM-dd'), // Exclui semana atual
    userId
  );
  
  return totalValue / weeks;
}

// Calcular projecao para metas semanais
function calculateProjection(
  currentValue: number,
  daysElapsed: number,
  totalDays: number
): number {
  if (daysElapsed === 0) return currentValue;
  const dailyRate = currentValue / daysElapsed;
  return dailyRate * totalDays;
}
```

### Passo 2: Atualizar Interface GoalWithRealProgress

Adicionar os novos campos ao tipo e popular durante o processamento.

### Passo 3: Atualizar GoalComparisonCard

Mostrar as novas metricas de forma clara e visualmente distinta.

---

## Beneficios da Abordagem

1. **Transparencia**: Usuario ve exatamente o que aconteceu hoje/esta semana
2. **Contexto**: Medias mostram se o resultado e normal ou anormal
3. **Projecao**: Para metas em curso, preve se vai cumprir no fim
4. **Tendencias**: Mostra se esta a melhorar ou piorar ao longo do tempo
5. **Motivacao**: Um dia mau nao assusta tanto quando a media e boa

---

## Sequencia de Implementacao

1. Adicionar novas funcoes de calculo ao hook
2. Expandir interface GoalWithRealProgress
3. Calcular medias e projecoes para cada meta
4. Atualizar logica de status para considerar contexto
5. Redesenhar GoalComparisonCard com novas metricas
6. Testar com metas diarias e semanais existentes

