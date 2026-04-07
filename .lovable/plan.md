

## Problema Identificado

Quando partilhas o link do produto nas redes sociais, **a imagem não aparece** porque:

1. **O `StoreShareButtons` usa `window.location.href`** (o URL direto da SPA). Crawlers do WhatsApp/Facebook não executam JavaScript, logo nunca veem as meta tags OG que o React Helmet injeta no client-side.

2. **Existe já um `og-proxy` edge function** que serve HTML estático com meta tags OG para crawlers — mas o componente de share do produto **não o usa**. Usa o URL direto em vez do `getShareUrl("product", ...)`.

3. **O og-proxy para produtos** tem um bug: procura `image_url` (campo que não existe ou está vazio) em vez de consultar `product_images` ou o array `images` da tabela products.

## Plano de Implementação

### 1. Corrigir o URL de partilha do produto
**Ficheiro**: `src/pages/store/StoreProductPage.tsx`

- Importar `getShareUrl` e passar `getShareUrl("product", wsSlug + "/" + product.id)` ao `StoreShareButtons` em vez de `window.location.href`

### 2. Corrigir o og-proxy para buscar a imagem correta
**Ficheiro**: `supabase/functions/og-proxy/index.ts`

- No bloco `type === "product"`: expandir o SELECT para incluir `images, short_description, base_price, currency, brand, category`
- Fazer fallback para `product_images` se `images` estiver vazio (padrão dual já usado no resto do sistema)
- Adicionar meta tags de produto (preço, moeda, disponibilidade) ao HTML gerado
- Usar `short_description` em vez de `description` (campo real da tabela)

### 3. Enriquecer o HTML do og-proxy para produtos
**Ficheiro**: `supabase/functions/og-proxy/index.ts`

- Criar função `buildProductOgHtml` que além das tags standard inclui:
  - `og:type` = `product`
  - `product:price:amount` e `product:price:currency`
  - `product:brand` e `product:category` (se existirem)
  - `og:image:width` e `og:image:height` (800x800 padrão para produtos)
- Isto garante que WhatsApp mostra preview rico e Facebook exibe card de produto

### 4. Melhorar o StoreShareButtons com mais opções
**Ficheiro**: `src/components/store/StoreShareButtons.tsx`

- Adicionar botão **Twitter/X**
- Adicionar botão **LinkedIn**
- Adicionar botão **Telegram**
- Adicionar **Native Share API** (navigator.share) como botão principal em mobile
- Preview visual: mostrar mini-card com imagem + título antes de partilhar (para o utilizador ver o que vai ser partilhado)

### 5. Adicionar og:image dimensions e validação
**Ficheiro**: `src/components/store/storefront/ProductSeoHead.tsx`

- Adicionar `og:image:width` e `og:image:height` para optimizar previews
- Adicionar `og:image:type` (image/jpeg ou image/png baseado na extensão)

## Detalhe Técnico

**Ficheiros modificados:**
- `src/pages/store/StoreProductPage.tsx` — usar `getShareUrl` em vez de `window.location.href`
- `supabase/functions/og-proxy/index.ts` — corrigir query de produto + HTML rico com meta tags de produto
- `src/components/store/StoreShareButtons.tsx` — adicionar Twitter, LinkedIn, Telegram, Native Share, mini-preview
- `src/components/store/storefront/ProductSeoHead.tsx` — adicionar dimensões de imagem OG

**Edge function redeploy automático** — sem migração necessária.

## Critérios de Aceitação
- Partilhar link no WhatsApp mostra imagem, título, descrição e preço
- Partilhar no Facebook mostra card de produto com imagem
- Botões de share incluem WhatsApp, Facebook, Twitter, LinkedIn, Telegram e copiar link
- Em mobile, o botão principal usa a Native Share API do browser
- Mini-preview mostra ao utilizador o que será partilhado antes de clicar

