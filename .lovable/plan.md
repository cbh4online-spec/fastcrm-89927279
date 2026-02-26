

# Adicionar Contador de Notas na Aba "Notas"

## Alterações

### 1. `src/hooks/useEntityCounts.ts`
- Adicionar `notes: number` ao interface `EntityCounts`
- Adicionar query à tabela `entity_notes` filtrando por `entity_type` e `entity_id` (e `workspace_id` via contexto)
- Incluir `notes: notesCount` no retorno

### 2. `src/components/entity/EntityHorizontalTabs.tsx`
- Adicionar `notes?: number` ao tipo `counts` nas props
- O badge já é renderizado automaticamente pelo `getCount(tab.id)` — basta que `counts.notes` exista

Nenhuma alteração nos 3 ficheiros de detalhe (Lead, Contact, Company) pois já passam `counts` directamente do `useEntityCounts`.

| Ficheiro | Acção |
|----------|-------|
| `useEntityCounts.ts` | Contar notas da tabela `entity_notes` |
| `EntityHorizontalTabs.tsx` | Adicionar `notes` ao tipo de counts |

