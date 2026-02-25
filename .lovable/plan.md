

# Adicionar Editar e Remover nos Cards de Oportunidade

## Problema

Os cards de oportunidade no Kanban não têm ações de editar ou remover. O utilizador quer poder editar e eliminar oportunidades diretamente a partir do card.

## Solução

Adicionar um menu de ações (ícone `MoreHorizontal`) no canto superior direito de cada card de oportunidade com opções "Editar" e "Remover", com diálogo de confirmação para a eliminação.

## Alterações

### 1. `src/components/opportunities/OpportunityCard.tsx`

- **Adicionar props**: `onEdit?: (opp: Opportunity) => void` e `onDelete?: (opp: Opportunity) => void`
- **Adicionar** um `DropdownMenu` com ícone `MoreHorizontal` no canto superior direito do card (visível no hover via `opacity-0 group-hover/card:opacity-100`)
- **Adicionar** `AlertDialog` para confirmação de eliminação ("Tem a certeza que deseja eliminar esta oportunidade?")
- O `e.stopPropagation()` nos botões previne que o click no menu abra o detalhe da oportunidade

### 2. `src/components/opportunities/OpportunityKanbanColumn.tsx`

- **Passar** as novas props `onEdit` e `onDelete` ao `OpportunityCard`
- Adicionar props `onEditOpportunity` e `onDeleteOpportunity` ao componente da coluna

### 3. `src/components/opportunities/OpportunitiesModule.tsx`

- **Importar** `useDeleteOpportunity` de `@/hooks/useOpportunities`
- **Passar** `onEditOpportunity` (navega para detalhe) e `onDeleteOpportunity` (chama o hook de delete com toast de sucesso) a cada `OpportunityKanbanColumn`

### Fluxo

```text
Card hover → ⋯ menu aparece
  ├─ "Editar" → navega para /dashboard/opportunities/:id
  └─ "Remover" → AlertDialog confirmação → delete via useDeleteOpportunity → toast sucesso
```

