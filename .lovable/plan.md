

# Editar Metas de Performance

## Resumo
Adicionar funcionalidade de edição às metas existentes, reutilizando o mesmo formulário da criação.

## Implementação

### 1. Hook `useUpdateGoal` em `usePerformanceGoals.ts`
Nova mutation que faz `supabase.from("performance_goals").update({...}).eq("id", goalId)` e invalida a query.

### 2. UI na `PerformanceGoalsPage.tsx`
- Adicionar botão de edição (ícone Pencil) ao lado do botão de eliminar em cada card
- Reutilizar o mesmo Dialog de criação, mas em modo "edição":
  - Ao clicar editar, preencher o form com os dados da meta selecionada
  - Alterar título do dialog para "Editar Meta"
  - Botão muda para "Guardar Alterações"
  - Estado `editingGoal` para controlar qual meta está a ser editada
- Ao submeter, chamar `useUpdateGoal` em vez de `useCreateGoal`

### Ficheiros
- **Editar**: `src/hooks/usePerformanceGoals.ts` — adicionar `useUpdateGoal`
- **Editar**: `src/pages/performance/PerformanceGoalsPage.tsx` — botão editar + lógica dual create/update no dialog

