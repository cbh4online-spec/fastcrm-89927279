

# Plano: Preencher Custos nos Itens de Proposta Existentes

## Problema Identificado

A query à base de dados mostra claramente o problema:

| Campo | Valor nos Items |
|-------|-----------------|
| `cost_snapshot` | NULL |
| `operational_cost_snapshot` | NULL |
| `direct_cost` (produto) | 350.00, 49.13, 39.57, etc. |

Os 5 itens de proposta existentes foram criados **antes** das alterações para gravar os custos. Por isso, embora os produtos tenham custos definidos, os campos de snapshot estão vazios.

O código de cálculo está correcto:
```typescript
const directCost = item.cost_snapshot ?? 0;  // → 0 porque é NULL
const opCost = item.operational_cost_snapshot ?? 0;  // → 0 porque é NULL
// Resultado: itemCost = 0, logo margem = 100%
```

---

## Solução

Executar uma migração SQL para preencher retroactivamente os custos a partir dos produtos associados.

### Migração SQL

```sql
-- Preencher cost_snapshot e operational_cost_snapshot 
-- a partir dos custos actuais do produto
UPDATE proposal_items pi
SET 
  cost_snapshot = pr.direct_cost,
  operational_cost_snapshot = pr.operational_cost
FROM products pr
WHERE pi.product_id = pr.id
  AND pi.cost_snapshot IS NULL;
```

---

## O que isto resolve

| Antes | Depois |
|-------|--------|
| `cost_snapshot = NULL` | `cost_snapshot = 350.00` (do produto) |
| `operational_cost_snapshot = NULL` | `operational_cost_snapshot = 5.00` (do produto) |
| Margem calculada = 100% ❌ | Margem calculada = valor real ✓ |

---

## Resultado Esperado

Após a migração, a proposta "Proposta Comercial" irá mostrar:

- **Custo real** calculado a partir dos custos dos produtos
- **Margem correcta** (valor e percentagem reais)
- Colunas "Custo" e "Margem" na tabela de itens com valores preenchidos

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| Nova migração SQL | UPDATE para preencher custos em falta |

---

## Nota

Esta é uma operação única de "backfill". As novas propostas criadas após as alterações anteriores já irão gravar os custos automaticamente através do `CreateProposalDialog.tsx` e `ProposalItemsEditor.tsx`.

