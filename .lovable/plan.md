

## Corrigir envio de produto no Telegram + botão Comprar no card do chat

### Problema 1 — Edge function `telegram-send` usa colunas erradas
A função consulta `price` e `description` que **não existem** na tabela `products`. Os campos corretos são `base_price`, `short_description`, `currency`, `images` e `primary_image_index`. Também tenta join com `product_images` mas os produtos usam o array `images` directamente.

### Problema 2 — Sem link de compra no Telegram
Quando envia produto para o Telegram, não inclui link para a loja.

### Problema 3 — Card do chat sem botão "Comprar"
O `ProductMessageCard` mostra imagem e preço mas não tem link/botão para a página do produto na loja.

---

### Alterações

#### 1. `supabase/functions/telegram-send/index.ts` — corrigir query de produto

No case `sendProduct` e `broadcast`:
- Mudar `.select('name, description, price, sku, product_images(url)')` para `.select('name, short_description, base_price, sku, images, primary_image_index, currency, workspace_id')`
- Extrair imagem do array `images` usando `primary_image_index` (mesmo padrão do frontend)
- Buscar `store_slug` do `store_settings` usando o `workspace_id` do produto
- Construir URL de compra: `https://fastcrm.metodopare.ai/store/{slug}/product/{id}`
- Formatar preço com currency correcto
- Adicionar link "🛒 Comprar" no texto da mensagem (inline link HTML)
- Usar `sendPhoto` com a imagem do array `images` se disponível

#### 2. `src/components/groups/ProductMessageCard.tsx` — adicionar botão Comprar

- Buscar `store_slug` do workspace via query ao `store_settings` (ou passar como prop)
- Adicionar botão/link "Comprar" com ícone `ExternalLink` que abre `/store/{slug}/product/{id}` em nova tab
- Usar `getPublicBaseUrl()` para construir o URL correcto

### Ficheiros alterados
- `supabase/functions/telegram-send/index.ts`
- `src/components/groups/ProductMessageCard.tsx`

