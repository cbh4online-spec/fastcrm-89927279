

# Plano: Custos, Margens e Responsável de Conta nas Propostas

## Contexto

A tabela `proposal_items` já possui os campos `cost_snapshot` e `operational_cost_snapshot` para armazenar custos, e os produtos relacionados têm `direct_cost` e `operational_cost`. No entanto, estes dados não estão visíveis na interface. Além disso, não existe forma de atribuir um responsável de conta (account manager) a cada proposta.

---

## Alterações Necessárias

### 1. Base de Dados

Adicionar coluna `assigned_to` à tabela `proposals`:

```sql
ALTER TABLE proposals 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Index para queries
CREATE INDEX idx_proposals_assigned_to ON proposals(assigned_to);
```

### 2. Cálculo de Custos e Margens

Os dados já estão disponíveis. Lógica de cálculo:

```text
┌─────────────────────────────────────────────────────┐
│ Para cada item da proposta:                         │
│                                                     │
│ Custo = (direct_cost + operational_cost) × quantity │
│ Receita = unit_price × quantity                     │
│ Margem = Receita - Custo                            │
│ Margem % = (Margem / Receita) × 100                 │
└─────────────────────────────────────────────────────┘
```

### 3. Componentes a Modificar

| Componente | Alteração |
|------------|-----------|
| `ProposalsList.tsx` | Adicionar colunas "Custo", "Margem", "Responsável" |
| `ProposalDetailDialog.tsx` | Mostrar custos/margens no header + selector de responsável |
| `ProposalInternalView.tsx` | Adicionar custo e margem por item e totais |
| `src/types/proposal.ts` | Adicionar `assigned_to` ao tipo |
| `useProposals.ts` | Fetch `assigned_to` com profile + update |

### 4. Novo Campo: Selector de Responsável

Usar `useWorkspaceMembers()` para listar membros disponíveis:

```typescript
// Selector com avatar e nome do membro
<Select value={proposal.assigned_to} onValueChange={...}>
  {members.map(member => (
    <SelectItem key={member.user_id} value={member.user_id}>
      <Avatar src={member.profile?.avatar_url} />
      {member.profile?.full_name || member.profile?.email}
    </SelectItem>
  ))}
</Select>
```

---

## Detalhes de Implementação

### ProposalsList - Novas Colunas

```typescript
// Cabeçalhos adicionais
<TableHead>Custo</TableHead>
<TableHead>Margem</TableHead>
<TableHead>Responsável</TableHead>

// Células com indicadores visuais
<TableCell className={marginPct >= 30 ? "text-green-600" : "text-red-600"}>
  {formatCurrency(margin)} ({marginPct.toFixed(0)}%)
</TableCell>
```

**Nota**: Para mostrar custos na lista, é necessário fazer join com `proposal_items` ou agregar os valores.

### ProposalDetailDialog - Secção Interna

Adicionar card de métricas financeiras no header:

```typescript
// Novo card após "Valor"
<div className="bg-card/50 rounded-lg p-3 border">
  <span className="text-xs text-muted-foreground">Custo / Margem</span>
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">{formatCurrency(totalCost)}</span>
    <span className={cn("font-semibold", marginPct >= 30 ? "text-green-600" : "text-red-600")}>
      +{formatCurrency(margin)} ({marginPct.toFixed(0)}%)
    </span>
  </div>
</div>
```

### ProposalInternalView - Custos por Item

Adicionar colunas à tabela interna:

```typescript
<TableHead className="w-24 text-right">Custo</TableHead>
<TableHead className="w-24 text-right">Margem</TableHead>

// Por item
<TableCell className="text-right text-muted-foreground">
  {formatCurrency(itemCost)}
</TableCell>
<TableCell className={cn("text-right font-medium", 
  itemMarginPct >= 30 ? "text-green-600" : "text-red-600"
)}>
  {formatCurrency(itemMargin)} ({itemMarginPct.toFixed(0)}%)
</TableCell>
```

### Tipos TypeScript

```typescript
// src/types/proposal.ts
export interface Proposal {
  // ... campos existentes
  assigned_to: string | null;
  assigned_to_profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface UpdateProposalInput {
  // ... campos existentes
  assigned_to?: string | null;
}
```

### Hook useProposals

```typescript
// Adicionar ao select da query
.select(`
  *,
  assigned_to_profile:profiles!proposals_assigned_to_fkey(
    id, full_name, email, avatar_url
  ),
  ...
`)

// No update
if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;
```

---

## Ficheiros a Modificar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| (migração SQL) | Backend | Adicionar `assigned_to` à tabela proposals |
| `src/types/proposal.ts` | Tipo | Adicionar campo `assigned_to` |
| `src/hooks/useProposals.ts` | Hook | Fetch profile do assigned_to + permitir update |
| `src/components/proposals/ProposalsList.tsx` | UI | Colunas Custo, Margem, Responsável |
| `src/components/proposals/ProposalDetailDialog.tsx` | UI | Card de métricas + selector responsável |
| `src/components/proposals/ProposalInternalView.tsx` | UI | Custos/margens por item |

---

## Visibilidade dos Dados

| Elemento | Visível Internamente | Visível para Cliente |
|----------|---------------------|---------------------|
| Custo total | Sim | Não |
| Margem % | Sim | Não |
| Custo por item | Sim | Não |
| Responsável de conta | Sim | Não |
| Preço/Valor | Sim | Sim |

---

## Estimativa

| Ficheiro | Linhas Novas/Alteradas |
|----------|------------------------|
| Migração SQL | ~5 linhas |
| proposal.ts | ~10 linhas |
| useProposals.ts | ~20 linhas |
| ProposalsList.tsx | ~50 linhas |
| ProposalDetailDialog.tsx | ~40 linhas |
| ProposalInternalView.tsx | ~30 linhas |
| **Total** | ~155 linhas |

