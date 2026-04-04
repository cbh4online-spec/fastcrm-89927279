

# Plano: Pedido de Preço (Price on Request)

## Diagnóstico

Não existe nenhum mecanismo para ocultar o preço de um produto na loja mantendo-o visível. Já existe um `StoreOfferDialog` para "Fazer Oferta" que pode servir de base, mas a lógica é diferente — aqui o cliente pede cotação sem ver preço.

## Solução

### Passo 1 — Migração DB

- Adicionar coluna `price_on_request` (boolean, default false) à tabela `products`
- Criar tabela `store_price_requests` para armazenar os pedidos:

```text
store_price_requests
├── id (uuid, PK)
├── workspace_id (uuid, FK workspaces)
├── product_id (uuid, FK products)
├── customer_name (text)
├── customer_email (text)
├── customer_phone (text, nullable)
├── message (text, nullable)
├── status (text: 'pending' | 'replied' | 'closed', default 'pending')
├── admin_notes (text, nullable)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

- RLS: INSERT para anon/authenticated, SELECT/UPDATE escopado por workspace via membership

### Passo 2 — Storefront: Ocultar preço + botão "Pedir Preço"

**StoreProductCard.tsx**: Quando `price_on_request = true`:
- Substituir bloco de preço por label "Preço sob consulta"
- Esconder botões "Adicionar ao Carrinho" e "Quick Buy"
- Manter Quick View, Wishlist e Compare

**StoreProductPage.tsx**: Quando `price_on_request = true`:
- Substituir preço por "Preço sob consulta"
- Substituir secção de quantidade + Add to Cart por botão "Pedir Preço" que abre dialog
- Esconder Sticky Add to Cart e Mobile Conversion Bar

### Passo 3 — StorePriceRequestDialog (novo componente)

Dialog similar ao StoreOfferDialog mas sem campo de preço:
- Campos: Nome, Email, Telefone (opcional), Mensagem (opcional)
- Submit insere em `store_price_requests`
- Mensagem de confirmação após envio

### Passo 4 — Backoffice

- No formulário de produto, adicionar toggle "Preço sob consulta" (`price_on_request`)
- Na área de loja/admin, criar secção ou tab para listar pedidos de preço recebidos com filtros por estado (pendente/respondido/fechado)

### Passo 5 — Hook e tipo

- Adicionar `price_on_request` ao interface `StoreProduct`
- Criar hook `useStorePriceRequests` para CRUD dos pedidos
- Incluir `price_on_request` no select query de `useStoreProducts`

## Ficheiros

| Ficheiro | Acção |
|---|---|
| Migração SQL | `price_on_request` + tabela `store_price_requests` + RLS |
| `src/components/store/StorePriceRequestDialog.tsx` | **Criar** |
| `src/hooks/useStorePriceRequests.ts` | **Criar** |
| `src/hooks/useStoreProducts.ts` | Adicionar campo ao interface e query |
| `src/components/store/StoreProductCard.tsx` | Condicional preço/carrinho |
| `src/pages/store/StoreProductPage.tsx` | Condicional preço/carrinho + dialog |
| `src/components/store/StoreQuickViewModal.tsx` | Condicional preço |
| `src/components/store/StoreStickyAddToCart.tsx` | Esconder se price_on_request |
| `src/components/store/StoreMobileConversionBar.tsx` | Esconder se price_on_request |
| Formulário de produto (backoffice) | Toggle price_on_request |

## Critérios de aceitação
- Produto com `price_on_request = true` não mostra preço em nenhuma vista da loja
- Botão "Pedir Preço" abre formulário e grava pedido na DB
- Produto continua visível, pesquisável e comparável
- Toggle funcional no backoffice
- Pedidos de preço listados no admin

