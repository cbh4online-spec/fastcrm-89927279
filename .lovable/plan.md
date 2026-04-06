

## Plano: Algoritmos Google & Facebook — Otimização para Tráfego

### Diagnóstico

O projeto tem infraestrutura parcial mas faltam peças críticas para os algoritmos de Google e Facebook gerarem tráfego:

**Google — O que existe:**
- ✅ Schema.org Product JSON-LD com `AggregateRating`, `Offer`, `BreadcrumbList`
- ✅ Sitemap da loja (`store-sitemap`) com produtos
- ✅ GTM + GA4 + dataLayer para eventos internos
- ✅ Canonical URLs, og:tags básicas

**Google — O que falta:**
- ❌ **Eventos e-commerce GA4 standard** (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) — o Google usa estes para alimentar campanhas Shopping/Performance Max
- ❌ **Google Product Feed (XML/RSS)** para Google Merchant Center — obrigatório para aparecer no Google Shopping
- ❌ **IndexNow** — notificação instantânea ao Google quando produtos novos são publicados
- ❌ **FAQ Schema** nas páginas de produto (boost de rich snippets)

**Facebook — O que existe:**
- ✅ Meta Pixel inicializado com PageView
- ✅ OG tags (og:title, og:image, product:price)

**Facebook — O que falta:**
- ❌ **Eventos standard do Pixel** (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) — sem estes, o algoritmo do Facebook não consegue otimizar campanhas
- ❌ **Facebook Product Catalog Feed (XML)** — obrigatório para Dynamic Product Ads e Instagram Shopping
- ❌ **Conversions API (CAPI)** server-side — o Facebook penaliza contas que dependem só do pixel browser (iOS tracking prevention)

### Implementação

#### 1. Eventos E-commerce Standard (Google GA4 + Meta Pixel)
Criar `src/lib/ecommerceTracking.ts` com funções que disparam simultaneamente para dataLayer (GA4) e fbq (Meta):

| Ação | GA4 Event | Meta Pixel Event |
|------|-----------|-----------------|
| Ver produto | `view_item` | `ViewContent` |
| Adicionar ao carrinho | `add_to_cart` | `AddToCart` |
| Iniciar checkout | `begin_checkout` | `InitiateCheckout` |
| Compra concluída | `purchase` | `Purchase` |

Integrar nos componentes existentes: `StoreProductPage`, `useStoreCartStore`, `useCheckoutForm`, `ThankYouPage`.

#### 2. Google Product Feed (Edge Function)
Nova edge function `store-product-feed` que gera XML compatível com Google Merchant Center:
- Formato RSS 2.0 com namespace `g:` (Google Shopping)
- Campos: `g:id`, `g:title`, `g:description`, `g:link`, `g:image_link`, `g:price`, `g:availability`, `g:brand`, `g:gtin`, `g:condition`, `g:product_type`
- URL: `/functions/v1/store-product-feed?slug={workspace}`
- Cache 1h, máximo 5000 produtos

#### 3. Facebook Catalog Feed (Edge Function)
Nova edge function `store-facebook-feed` que gera XML/CSV compatível com Facebook Commerce Manager:
- Campos Facebook: `id`, `title`, `description`, `availability`, `condition`, `price`, `link`, `image_link`, `brand`, `google_product_category`
- URL: `/functions/v1/store-facebook-feed?slug={workspace}`

#### 4. Conversions API (CAPI) Server-Side
Nova edge function `store-capi-event` para enviar eventos server-side ao Facebook:
- Recebe eventos do frontend via POST
- Envia ao Graph API `/events` com `event_name`, `event_time`, `user_data` (hashed email/phone), `custom_data` (value, currency, content_ids)
- Deduplica com `event_id` partilhado entre Pixel e CAPI
- Campos de configuração na `store_settings`: `facebook_pixel_id`, `facebook_capi_token`, `facebook_catalog_id`

#### 5. IndexNow — Notificação Instantânea
Nova edge function `store-indexnow` chamada automaticamente quando um produto é publicado/atualizado:
- Envia POST ao `https://api.indexnow.org/indexnow` com a URL do produto
- Chave IndexNow armazenada em ficheiro estático

#### 6. Migração DB
Adicionar à tabela `store_settings`:
- `facebook_pixel_id` (TEXT) — Pixel ID por loja (override do default)
- `facebook_capi_token` (TEXT) — Token de acesso à Conversions API
- `facebook_catalog_id` (TEXT) — ID do catálogo Facebook
- `google_merchant_id` (TEXT) — ID do Google Merchant Center

### Ficheiros a criar/modificar

**Novos:**
- `src/lib/ecommerceTracking.ts` — Tracking unificado GA4 + Meta Pixel
- `supabase/functions/store-product-feed/index.ts` — Google Merchant Feed
- `supabase/functions/store-facebook-feed/index.ts` — Facebook Catalog Feed
- `supabase/functions/store-capi-event/index.ts` — Conversions API server-side
- `supabase/functions/store-indexnow/index.ts` — IndexNow notificação

**Modificados:**
- `src/pages/store/StoreProductPage.tsx` — Adicionar `view_item` + `ViewContent`
- `src/stores/useStoreCartStore.ts` — Adicionar `AddToCart` ao Meta Pixel
- `src/components/store/checkout/useCheckoutForm.ts` — Adicionar `InitiateCheckout`
- `src/pages/checkout/ThankYouPage.tsx` — Adicionar `purchase` + `Purchase`
- `src/modules/growth-seo/lib/gtmEvents.ts` — Estender com eventos e-commerce
- Migração SQL — Novos campos em `store_settings`

### Impacto Esperado
- **Google Shopping**: Produtos indexados e elegíveis para aparecer em resultados de compras
- **Facebook/Instagram Ads**: Dynamic Product Ads automáticos e retargeting baseado em comportamento real
- **SEO**: Indexação 10x mais rápida via IndexNow
- **ROAS**: Dados de conversão server-side (CAPI) melhoram a atribuição em ~30%

