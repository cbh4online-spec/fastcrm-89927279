

# Corrigir OG Meta Tags para Partilhas de Links C2C

## Problema
Quando se partilha `https://fastcrm.metodopare.ai/c2c/metodopare` no WhatsApp/Facebook, aparece a imagem e descrição genérica do FastCRM porque:
1. A edge function `og-proxy` usa o domínio antigo (`fastcrm.lovable.app`)
2. A `og-proxy` não tem handler para páginas C2C (`type === "c2c"`)
3. O `C2CPublicMarketplace` não tem `<Helmet>` com OG tags
4. Os crawlers (WhatsApp, Facebook) não executam JavaScript — precisam de OG tags no HTML inicial

## Solução

### 1. Atualizar domínio na `og-proxy`
**Ficheiro: `supabase/functions/og-proxy/index.ts`**
- Alterar `BASE_URL` de `https://fastcrm.lovable.app` para `https://fastcrm.metodopare.ai`

### 2. Adicionar handler C2C na `og-proxy`
Adicionar caso `type === "c2c"` que:
- Recebe slug do workspace (ex: `metodopare`)
- Consulta `workspaces` para obter `name`
- Consulta `workspace_store_settings` para `store_name`, `store_description`, `logo_url`
- Gera título: `"{store_name} — Marketplace C2C"` e descrição adequada
- URL de redirect: `https://fastcrm.metodopare.ai/c2c/{slug}`

### 3. Adicionar `<Helmet>` ao `C2CPublicMarketplace`
Para que o client-side também tenha OG tags (quando o browser acede diretamente):
- Adicionar `react-helmet-async` com `og:title`, `og:description`, `og:image`, `og:url`
- Usar dados do workspace carregado

### 4. Adicionar handler para seller profiles e listings
Adicionar casos `type === "c2c-seller"` e `type === "c2c-listing"` para partilhas de perfis de vendedor e anúncios individuais.

### Ficheiros a alterar
- `supabase/functions/og-proxy/index.ts` — domínio + handlers C2C
- `src/pages/c2c/C2CPublicMarketplace.tsx` — adicionar `<Helmet>`
- `src/pages/c2c/C2CPublicSellerProfile.tsx` — adicionar `<Helmet>`

