

# Uniformizar todos os links da plataforma com o dominio principal

## Problema

Existem cerca de 20 ficheiros que ainda usam `window.location.origin` para gerar links publicos. Quando acedidos a partir de dominios Lovable (preview/dev), os links gerados apontam para o dominio errado em vez de `https://fastcrm.metodopare.ai`.

## Solucao

Substituir `window.location.origin` por `getPublicBaseUrl()` (ja criado em `src/utils/getPublicDomain.ts`) em todos os locais que geram links publicos partilhaveis ou visiveis para utilizadores externos.

## Ficheiros a alterar

| Ficheiro | Contexto | Acao |
|---|---|---|
| `src/components/proposals/ProposalDetailContent.tsx` | URL publica de proposta (`/p/{slug}`) | Substituir |
| `src/components/proposals/ProposalsList.tsx` | URL publica de proposta (`/p/{slug}`) | Substituir |
| `src/components/landing-pages/LandingPagesList.tsx` | URL publica de landing page | Substituir |
| `src/components/smart-forms/SmartFormsList.tsx` | Link publico de formulario (`/f/{slug}`) | Substituir |
| `src/components/chat-widget/WidgetConfigPanel.tsx` | URL do script do widget | Substituir |
| `src/components/store-settings/ProductVisibilityControl.tsx` | Link de produto da loja | Substituir |
| `src/pages/store/StorePage.tsx` | Meta tags OG, canonical, JSON-LD | Substituir |
| `src/pages/store/StoreProductPage.tsx` | Meta tags OG, canonical | Substituir |
| `src/pages/store/StoreReferralPage.tsx` | Link de referral | Substituir |
| `src/pages/store/StoreCheckoutPage.tsx` | successUrl e cancelUrl do checkout | Substituir |
| `src/pages/c2c/C2CSellerArea.tsx` | URL publica do perfil de vendedor | Substituir |
| `src/pages/c2c/C2CMyListings.tsx` | URL de listagem C2C | Substituir |
| `src/pages/client/ClientForgotPasswordPage.tsx` | redirectTo do reset de password | Substituir |
| `src/hooks/useC2CSellerInvites.ts` | domain enviado ao edge function de convites | Substituir |
| `src/modules/growth-seo/components/admin/SitemapManager.tsx` | baseUrl do sitemap | Substituir |

## Ficheiros que NAO devem ser alterados

| Ficheiro | Razao |
|---|---|
| `src/contexts/AuthContext.tsx` | O `emailRedirectTo` do signup precisa do dominio real onde o utilizador esta (callback OAuth) |
| `src/hooks/useWorkspaceVideoConfig.ts` | Redirect OAuth -- precisa do dominio atual para callback |
| `src/utils/getPublicDomain.ts` | Ja contem o fallback correto (o `window.location.origin` aqui e intencional) |

## Detalhes tecnicos

Cada alteracao segue o mesmo padrao simples:

1. Adicionar import: `import { getPublicBaseUrl } from "@/utils/getPublicDomain";`
2. Substituir `window.location.origin` por `getPublicBaseUrl()`

Nao ha alteracao de logica -- apenas a origem do URL muda para garantir que aponta sempre para o dominio de producao quando acedido a partir de ambientes de desenvolvimento.

Total: 15 ficheiros editados, 0 ficheiros criados.
