
# Plano: Corrigir Gravação dos Custos nos Itens de Proposta

## Problema Identificado

Os campos `cost_snapshot` e `operational_cost_snapshot` estão `NULL` na tabela `proposal_items` porque:

| Local | Estado |
|-------|--------|
| Carrinho (ProposalCart) | Calcula custos correctamente de `product.direct_cost` |
| Criação (CreateProposalDialog) | **Não envia** custos para o hook |
| Hook (useProposals.updateProposalItems) | **Não inclui** custos no INSERT |
| Tabela proposal_items | Campos `cost_snapshot` = NULL |

```text
┌────────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│  CartItem          │ --> │ updateProposalItems  │ --> │ proposal_items    │
│  ─────────────────│     │  ────────────────────│     │  ─────────────────│
│  product.          │     │  name                │     │  cost_snapshot    │
│    direct_cost    │     │  quantity            │     │    = NULL ❌      │
│    = 39.57        │     │  unit_price          │     │                   │
│                    │     │  (sem custos!) ❌    │     │                   │
└────────────────────┘     └──────────────────────┘     └───────────────────┘
```

---

## Solução

Passar os custos do produto quando os items são salvos, guardando um snapshot do custo no momento da criação.

---

## Alterações Necessárias

### 1. `src/hooks/useProposals.ts` - Adicionar campos de custo ao tipo de input

Actualizar a interface do `updateProposalItems` para aceitar os campos de custo:

```typescript
// Antes (linha 550-558)
items: Array<{
  id?: string;
  product_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  position: number;
  is_enabled?: boolean;
}>

// Depois
items: Array<{
  id?: string;
  product_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  position: number;
  is_enabled?: boolean;
  cost_snapshot?: number | null;           // NOVO
  operational_cost_snapshot?: number | null; // NOVO
}>
```

### 2. `src/hooks/useProposals.ts` - Incluir custos no INSERT

Actualizar o objecto `insertData` para incluir os snapshots:

```typescript
// Antes (linha 572-582)
const insertData = items.map((item, idx) => ({
  proposal_id: proposalId,
  workspace_id: currentWorkspace.id,
  product_id: item.product_id,
  name: item.name,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  position: item.position ?? idx,
  is_enabled: item.is_enabled ?? true,
}));

// Depois
const insertData = items.map((item, idx) => ({
  proposal_id: proposalId,
  workspace_id: currentWorkspace.id,
  product_id: item.product_id,
  name: item.name,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  position: item.position ?? idx,
  is_enabled: item.is_enabled ?? true,
  cost_snapshot: item.cost_snapshot ?? null,                     // NOVO
  operational_cost_snapshot: item.operational_cost_snapshot ?? null, // NOVO
}));
```

### 3. `src/components/proposals/CreateProposalDialog.tsx` - Passar custos do produto

Incluir os custos quando os items são mapeados:

```typescript
// Antes (linha 262-271)
items: cartItems.map((item, idx) => ({
  product_id: item.product.id,
  name: item.product.name,
  description: item.product.short_description || null,
  quantity: item.quantity,
  unit_price: item.priceOverride ?? item.product.base_price ?? 0,
  position: idx,
  is_enabled: true,
})),

// Depois
items: cartItems.map((item, idx) => ({
  product_id: item.product.id,
  name: item.product.name,
  description: item.product.short_description || null,
  quantity: item.quantity,
  unit_price: item.priceOverride ?? item.product.base_price ?? 0,
  position: idx,
  is_enabled: true,
  cost_snapshot: item.product.direct_cost ?? null,        // NOVO
  operational_cost_snapshot: item.product.operational_cost ?? null, // NOVO
})),
```

### 4. Outros locais que usam `updateProposalItems`

Preciso verificar se há mais locais que chamam esta função:

- `ProposalItemsEditor.tsx` - provável
- `ProposalDetailDialog.tsx` - possível

Cada local que chama `updateProposalItems` deve incluir os custos.

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useProposals.ts` | Adicionar `cost_snapshot` e `operational_cost_snapshot` ao tipo e INSERT |
| `src/components/proposals/CreateProposalDialog.tsx` | Passar custos do produto |
| Outros componentes que usam updateProposalItems | Passar custos do produto |

---

## Resultado Esperado

| Campo | Antes | Depois |
|-------|-------|--------|
| `cost_snapshot` | NULL | 39.57 (valor do produto) |
| `operational_cost_snapshot` | NULL | 5.00 (valor do produto) |
| Cálculo de margem | 0€ (incorreto) | Valor correcto |

---

## Nota sobre Dados Existentes

Os itens de proposta já criados continuarão com custos NULL. Se necessário, posso também criar uma migração SQL para preencher retroactivamente os custos a partir dos produtos associados.

---

## Estimativa

| Ficheiro | Linhas |
|----------|--------|
| useProposals.ts | ~8 linhas |
| CreateProposalDialog.tsx | ~2 linhas |
| Outros componentes | ~4-8 linhas |
| **Total** | ~15-20 linhas |
