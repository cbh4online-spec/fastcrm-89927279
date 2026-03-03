

# Adicionar Link para Loja Online nos Itens da Proposta

## Problema
Quando um produto está publicado na loja online (status "active"), não há forma rápida de o visualizar a partir da proposta.

## Solução

### 1. Expandir dados passados ao `ProposalInternalView`

**`src/components/proposals/ProposalDetailContent.tsx`** — No mapeamento de items (linha ~975), adicionar `product_id` e `product_status`:
```typescript
product_id: item.product_id,
product_status: item.product?.status,
```

**`src/hooks/useProposals.ts`** — Adicionar `status` ao select do produto na query de proposal items:
```
product:products(id, name, base_price, direct_cost, operational_cost, images, primary_image_index, status)
```

Atualizar interface `ProposalItem.product` para incluir `status?: string`.

### 2. Adicionar link na tabela de itens

**`src/components/proposals/ProposalInternalView.tsx`**:
- Atualizar a interface para aceitar `product_id` e `product_status` nos items
- Importar `useWorkspace` e `getPublicBaseUrl`
- Junto ao nome de cada item, se `product_status === "active"` e existe `product_id`, mostrar um ícone `ExternalLink` que abre `/store/{workspace.slug}/product/{product_id}` numa nova tab
- Ícone pequeno (h-3.5 w-3.5) com tooltip "Ver na loja online"

### Ficheiros a editar
- `src/hooks/useProposals.ts` — adicionar `status` ao select e interface
- `src/components/proposals/ProposalDetailContent.tsx` — passar `product_id` e `product_status`
- `src/components/proposals/ProposalInternalView.tsx` — mostrar link para loja

