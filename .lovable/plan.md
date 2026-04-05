

# Preços com IVA (B2C) vs sem IVA (B2B/Revenda)

## Diagnóstico

O sistema já tem as peças necessárias mas não as conecta:
- `StoreVatContext` controla a label "c/ IVA" vs "+ IVA (X%)" — mas usa apenas o setting da loja (`prices_include_vat`), ignorando se o utilizador é B2B
- `useStoreTierPricing` já deteta se o utilizador é B2B (`isB2B: true`) — mas não influencia a apresentação de IVA
- O Portal do Cliente (`/client/*`) já mostra "s/ IVA" hardcoded — está correto
- O Partner Center (`/partner/*`) já trabalha com `unit_price_net` — está correto
- **Problema**: Na loja pública, um cliente B2B vê preços "c/ IVA" quando devia ver "s/ IVA"

## Plano de Implementação

### 1. Expandir `StoreVatContext` para aceitar override B2B

Adicionar prop `forceExcludeVat` ao `StoreVatProvider`. Quando `true`, o contexto reporta `pricesIncludeVat: false` independentemente do setting da loja.

### 2. Passar `isB2B` do tier pricing para o `StoreVatProvider`

Em `StorePage.tsx` e `StoreProductPage.tsx`, já se usa `useStoreTierPricing`. Passar `tierPricing?.isB2B` ao provider para forçar preços sem IVA para clientes B2B.

### 3. Ajustar cálculo de preço no `StoreProductCard`

Quando `isB2B`, os preços do tier já vêm como `price_net`. Garantir que o `StoreVatLabel` mostra "s/ IVA" e que o preço apresentado é o líquido (sem VAT).

### 4. Ajustar checkout da loja

Garantir que no carrinho e checkout, se o utilizador é B2B, os preços são apresentados sem IVA com o total de IVA discriminado separadamente.

## Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/contexts/StoreVatContext.tsx` | Adicionar lógica de override quando `isB2B` |
| `src/pages/store/StorePage.tsx` | Passar `isB2B` ao `StoreVatProvider` |
| `src/pages/store/StoreProductPage.tsx` | Passar `isB2B` ao `StoreVatProvider` |
| `src/components/store/StoreVatLabel.tsx` | Ajustar label para B2B: "s/ IVA" em vez de "+ IVA (23%)" |
| `src/components/store/StoreCartDrawer.tsx` | Discriminar IVA separadamente para B2B |

## Lógica

```text
SE utilizador é B2B (tier pricing ativo):
  → Preços apresentados = preço líquido (sem IVA)
  → Label = "s/ IVA"
  → No checkout: subtotal + IVA discriminado + total

SE utilizador é B2C (consumidor final):
  → Preços apresentados = preço com IVA (conforme setting da loja)
  → Label = "c/ IVA" ou "+ IVA (23%)"
```

## Critérios de Aceitação

- Cliente B2C vê preços com IVA incluído e label "c/ IVA"
- Cliente B2B autenticado com tier vê preços sem IVA e label "s/ IVA"
- Checkout B2B discrimina subtotal líquido, valor de IVA, e total bruto
- Portal do Cliente e Partner Center mantêm comportamento atual (sem IVA)
- Sem regressões na loja pública para visitantes não autenticados

