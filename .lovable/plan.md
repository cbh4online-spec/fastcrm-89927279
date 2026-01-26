
# Plano: Mostrar Resultado Final em Cada Linha Temporal

## Resumo
Adicionar um resumo agregado do progresso calculado no final de cada período (linha temporal), mostrando o valor atual total versus o objetivo total para todas as metas desse período.

## O Que Será Feito

### 1. Criar Componente de Resumo de Período
Adicionar uma secção de resumo visual no topo de cada tab de período que mostre:
- **Progresso Total**: Soma dos valores calculados automaticamente
- **Objetivo Total**: Soma dos valores alvo de todas as metas
- **Barra de Progresso Visual**: Indicador gráfico do progresso agregado
- **Indicadores por Tipo**: Breakdown por unidade (ex: €1722/€5000 em Faturação, 3/5 Vendas)

### 2. Localização no Interface
O resumo aparecerá:
- No início de cada `TabsContent` de período
- Antes da listagem dos cards de metas individuais
- Substituindo/melhorando o resumo atual que só mostra "X de Y metas concluídas"

### 3. Formato de Visualização
```text
┌─────────────────────────────────────────────────────────────┐
│  📊 Resumo do Período                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  Progresso Geral: 65%                                       │
│  [████████████████░░░░░░░░░]                                │
│                                                             │
│  💰 Faturação: €1.722 / €5.000                              │
│  🛒 Vendas: 3 / 5                                           │
│  📞 Chamadas: 12 / 20                                       │
│                                                             │
│  ✅ 2 de 4 metas concluídas                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Ficheiro: `src/components/productivity/GoalsManager.tsx`

#### Alteração 1: Criar Componente PeriodSummary
Adicionar um novo componente interno que:
- Recebe a lista de metas filtradas do período
- Recebe o mapa de progresso automático (`autoProgressMap`)
- Agrupa as metas por unidade
- Calcula totais por tipo de métrica
- Renderiza o resumo visual

```typescript
interface PeriodSummaryProps {
  goals: ProductivityGoal[];
  autoProgressMap: Record<string, { calculatedValue: number; isAutomatic: boolean; source: string }>;
}

function PeriodSummary({ goals, autoProgressMap }: PeriodSummaryProps) {
  // Agrupar por unidade e calcular totais
  const summaryByUnit = useMemo(() => {
    const grouped: Record<string, { current: number; target: number; count: number }> = {};
    
    goals.forEach(goal => {
      const unit = goal.unit || 'unidades';
      const autoProgress = autoProgressMap[goal.id];
      const currentValue = autoProgress?.isAutomatic 
        ? autoProgress.calculatedValue 
        : (goal.current_value || 0);
      
      if (!grouped[unit]) {
        grouped[unit] = { current: 0, target: 0, count: 0 };
      }
      grouped[unit].current += currentValue;
      grouped[unit].target += goal.target_value || 0;
      grouped[unit].count += 1;
    });
    
    return grouped;
  }, [goals, autoProgressMap]);

  // Renderizar resumo
  // ...
}
```

#### Alteração 2: Integrar no TabsContent
Substituir o resumo atual (linhas 1144-1154) pelo novo componente:

```typescript
<TabsContent value={period}>
  {/* Novo Resumo de Período */}
  <PeriodSummary 
    goals={filteredGoals} 
    autoProgressMap={autoProgressMap} 
  />
  
  {/* Grid de Cards existente */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {filteredGoals.map((goal) => (
      <GoalCard key={goal.id} ... />
    ))}
  </div>
</TabsContent>
```

#### Alteração 3: Formatação de Valores
Utilizar formatação apropriada para cada tipo de unidade:
- **Financeiro (euros, faturação)**: `€1.722` com separador de milhares
- **Contagem (vendas, chamadas)**: `3 / 5` formato simples
- **Percentagem**: `65%` com símbolo

### Componentes Visuais
- Utilizar `Card` existente para o container
- `Progress` bar para indicador visual
- `Badge` para indicadores de tipo
- Ícones correspondentes de `lucide-react` para cada métrica

---

## Fluxo de Dados
1. `GoalsManager` carrega metas via `useProductivityCoach`
2. `useGoalsProgress` calcula progresso automático para cada meta
3. `PeriodSummary` recebe dados filtrados por período
4. Componente agrega e formata para exibição

## Resultado Esperado
O utilizador verá imediatamente o resumo do progresso real de cada período, com valores como "€1.722 / €5.000 em Faturação" claramente visíveis no topo de cada secção temporal.
