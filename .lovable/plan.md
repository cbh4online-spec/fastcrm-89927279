

# Plano: Custos, Margens e Responsável de Conta nas Propostas

## Estado: ✅ Implementado

---

## Alterações Realizadas

### 1. Base de Dados ✅
- Adicionada coluna `assigned_to` (uuid) à tabela `proposals`
- Criado índice `idx_proposals_assigned_to` para performance

### 2. Tipos TypeScript ✅
- `src/types/proposal.ts`: Adicionado `assigned_to` e `assigned_to_profile` ao tipo `Proposal`
- `UpdateProposalInput`: Adicionado `assigned_to?: string | null`

### 3. Hook useProposals ✅
- Query agora inclui `assigned_to_profile` via join com `profiles`
- Função de update permite alterar `assigned_to`

### 4. ProposalInternalView ✅
- Colunas "Custo" e "Margem" adicionadas à tabela de itens
- Custo calculado: `(cost_snapshot + operational_cost_snapshot) × quantity`
- Margem com indicador visual (verde ≥30%, vermelho <30%)
- Totais de custo e margem no footer

### 5. ProposalDetailDialog ✅
- Card "Custo / Margem" no header (6 colunas agora)
- Selector de "Responsável" com avatar e nome
- Dados de custo passados para ProposalInternalView

### 6. ProposalsList ✅
- Coluna "Responsável" com avatar e nome
- Dados obtidos via join automático

---

## Visibilidade dos Dados

| Elemento | Internamente | Cliente |
|----------|-------------|---------|
| Custo total | ✅ | ❌ |
| Margem % | ✅ | ❌ |
| Custo por item | ✅ | ❌ |
| Responsável | ✅ | ❌ |
| Preço/Valor | ✅ | ✅ |

---

## Notas Técnicas

- Os custos são lidos de `cost_snapshot` e `operational_cost_snapshot` na tabela `proposal_items`
- O join com `profiles` usa a foreign key `proposals_assigned_to_fkey`
- O selector de responsável usa `useWorkspaceMembers()` para listar membros
