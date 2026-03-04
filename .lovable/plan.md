

# Corrigir Partilha de Links C2C — Usar og-proxy em Vez de URLs Diretos

## Problema
Quando se partilha `https://fastcrm.metodopare.ai/c2c/metodopare` diretamente, os crawlers (WhatsApp, Facebook) recebem o `index.html` genérico com OG tags do FastCRM genérico. A edge function `og-proxy` já existe e gera OG tags corretos, mas os componentes de partilha usam URLs diretos em vez de passar pelo og-proxy.

## Solução
Substituir todos os URLs de partilha nas páginas C2C para usar `getShareUrl()` (que aponta para o og-proxy). O og-proxy serve OG tags corretos aos crawlers e redireciona utilizadores reais para a página.

## Alterações

### 1. `src/pages/c2c/C2CListingDetail.tsx`
- Importar `getShareUrl` 
- Mudar `url={window.location.href}` para `url={getShareUrl("c2c-listing", workspaceSlug + "/" + listingId)}`

### 2. `src/pages/c2c/C2CMyListings.tsx`
- Importar `getShareUrl`
- Mudar `listingUrl` de URL direto para `getShareUrl("c2c-listing", workspaceSlug + "/" + listing.id)`

### 3. `src/pages/c2c/C2CPublicMarketplace.tsx`
- O `shareUrl` já é calculado com `getShareUrl("c2c", ...)` mas precisa de ser usado nos componentes de partilha da página (atualmente não é passado a nenhum `ShareButtons` visível — verificar se há botões de partilha na página e garantir que usam `shareUrl`)

### 4. `src/pages/c2c/C2CPublicSellerProfile.tsx`
- Se existirem botões de partilha, usar `getShareUrl("c2c-seller", workspaceSlug + "/" + sellerId)`

### 5. `src/components/c2c/ShareButtons.tsx`
- Sem alterações necessárias — o componente já recebe `url` como prop

## Resultado
Os links partilhados passarão pelo og-proxy, que serve OG tags com título, descrição e imagem do marketplace/listing específico, em vez da imagem genérica do FastCRM.

