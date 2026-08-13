# Funis de Checkout ligados ao catálogo de produtos

## Diagnóstico

O separador **Produtos & preço** do funil é apenas texto livre: nome, quantidade e preço escritos à mão, guardados em `checkout_funnels.settings.products`. Não há qualquer ligação ao catálogo (`products`), pelo que:

- Preços e nomes duplicam-se e desatualizam-se face ao catálogo.
- Não há imagem, SKU, descrição nem IVA no resumo do checkout — o cliente vê apenas uma linha com um nome.
- As ofertas (`checkout_offers`) têm campo `product_id` mas o ecrã de ofertas não o preenche a partir do catálogo, logo order bumps e upsells também são manuais.
- A função `checkout-create-session` monta as linhas Stripe a partir desse texto livre (`price_data` improvisado), sem IVA nem imagem.

Existe uma tabela `funnel_products` no projeto, mas pertence ao outro módulo de funis (`funnels`), não ao checkout — não vai ser reutilizada aqui.

## O que vai ser construído

### 1. Seletor de produtos do catálogo
Novo componente de pesquisa de produtos (nome/SKU, com imagem, preço e estado) usado em:
- **Produtos & preço** do funil — botão "Adicionar do catálogo" além de "linha manual".
- **Ofertas** (upsell / downsell / order bump) — preencher nome, preço, imagem e descrição a partir do produto escolhido, mantendo a edição manual por cima.

Cada linha do funil passa a guardar `product_id`, `sku`, `image_url`, `tax_rate` e `price` (herdado do catálogo, editável com aviso "preço alterado face ao catálogo"). Linhas manuais continuam a funcionar (`product_id: null`), pelo que nenhum funil atual se parte.

### 2. Preço, IVA e descontos corretos
- Cada linha mostra preço unitário, IVA (herdado do produto) e total.
- Resumo com Subtotal, IVA, Desconto e Total.
- Suporte a desconto do funil (valor fixo ou %), guardado nas definições.
- Compare-at price opcional por linha para mostrar "poupança" no checkout.

### 3. Checkout público mais rico (estilo InvoiceXpress)
`CheckoutPage` passa a mostrar um resumo de encomenda real: miniatura do produto, SKU, quantidade, preço unitário, subtotal, IVA, order bumps e total. Layout limpo em duas colunas (dados do cliente à esquerda, resumo fixo à direita), colapsável em mobile.

### 4. Sessão Stripe alinhada
`checkout-create-session` passa a:
- Reler os produtos do catálogo pelo `product_id` e usar o preço/IVA guardados no funil (validando contra valores negativos ou nulos).
- Enviar imagem e descrição nas `product_data` do Stripe.
- Registar `product_id` em `cart_data` para rastreio de vendas por produto.

### 5. Robustez e UX
- Aviso claro quando um produto associado foi eliminado ou desativado no catálogo.
- Botão "Sincronizar preços do catálogo" que atualiza as linhas ligadas.
- Estados de loading/erro/vazio no seletor; acessível por teclado; `aria-label` nas ações.
- Validação zod alargada (product_id uuid opcional, tax_rate 0–100).

## Estrutura técnica

- `src/components/checkout/admin/ProductPickerDialog.tsx` — pesquisa no catálogo com debounce (usa `useProducts`).
- `src/components/checkout/admin/FunnelProductsEditor.tsx` — linhas ligadas ao catálogo, IVA, desconto e totais.
- `src/components/checkout/admin/OfferForm` (ecrã de Ofertas) — ligação ao catálogo via o mesmo picker.
- `src/schemas/checkout/funnelSchema.ts` — estender `funnelProductSchema` com `product_id`, `sku`, `image_url`, `tax_rate`, `compare_at_price`; helpers `funnelTotals()` (subtotal/IVA/desconto/total).
- `src/pages/checkout/CheckoutPage.tsx` — novo resumo de encomenda.
- `supabase/functions/checkout-create-session/index.ts` — line items com imagem, IVA e `product_id`.

Sem alterações de esquema de base de dados: tudo cabe em `checkout_funnels.settings` e no `product_id` já existente em `checkout_offers`.

## Critérios de aceitação

- Adicionar um produto do catálogo ao funil traz nome, SKU, preço, imagem e IVA automaticamente.
- Alterar o preço na linha é possível, com indicação visual de que difere do catálogo.
- Totais no backoffice batem certo com o resumo do checkout público e com o valor cobrado pelo Stripe.
- Order bumps e upsells podem ser criados a partir de um produto do catálogo em poucos cliques.
- Funis antigos (linhas manuais) continuam a funcionar sem migração.
- Consola sem erros; funciona em mobile e por teclado.

## Riscos por validar

- Produtos com IVA incluído vs. excluído: seguir a convenção existente em `src/utils/productPricing.ts` (análise sempre sobre o preço líquido) e apresentar o total com IVA ao cliente.
- Stripe por workspace: sem chave ativa o pagamento continua a falhar — o aviso já existente mantém-se.
