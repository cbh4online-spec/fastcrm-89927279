

# Plano: Domínio customizado configurável no backoffice do Marketplace

## Contexto
Atualmente o domínio `vendersimples.com` está hardcoded em `getMarketplaceBaseUrl()`. A tabela `c2c_marketplace_config` já tem colunas `custom_domain` e `custom_domain_verified` — só falta expô-las na UI e consumir dinamicamente.

## Alterações

### 1. Adicionar campo de domínio customizado ao MarketplaceConfigPage
**Ficheiro:** `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx`
- Adicionar `custom_domain` ao estado do formulário
- Na tab "Geral", adicionar secção "Domínio Público" com:
  - Input para domínio (ex: `vendersimples.com`)
  - Texto explicativo com instruções DNS (A record → 185.158.133.1)
  - Indicador visual do estado de verificação (`custom_domain_verified`)
- O `publicUrl` passa a usar o `custom_domain` se definido, senão fallback para `fastcrm.metodopare.ai`

### 2. Atualizar `getMarketplaceBaseUrl` para aceitar domínio dinâmico
**Ficheiro:** `src/utils/getPublicDomain.ts`
- Manter o fallback `https://vendersimples.com` como default
- Adicionar variante `getMarketplaceBaseUrlFromConfig(customDomain?: string | null)` que retorna `https://{customDomain}` se definido e verificado

### 3. Atualizar interface MarketplaceConfig
**Ficheiro:** `src/hooks/useMarketplace.ts`
- Adicionar `custom_domain?: string | null` e `custom_domain_verified?: boolean | null` à interface

### 4. Componentes que geram links públicos — consumir domínio da config
**Ficheiros:** `C2CPublicLinksManager.tsx`, `C2CMyListings.tsx`, `C2CSellerArea.tsx`, `C2CPublicMarketplace.tsx`, `C2CPublicSellerProfile.tsx`
- Onde já têm acesso à `marketplaceConfig`, usar `getMarketplaceBaseUrlFromConfig(config?.custom_domain)` em vez de `getMarketplaceBaseUrl()`

### 5. Atualizar og-proxy para ler domínio da config
**Ficheiro:** `supabase/functions/og-proxy/index.ts`
- Na secção marketplace/c2c, após buscar a config, usar `custom_domain` da config para definir `pageUrl` em vez do hardcoded `MARKETPLACE_URL`

### Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx` | Adicionar secção "Domínio Público" com input + estado DNS |
| `src/utils/getPublicDomain.ts` | Nova função `getMarketplaceBaseUrlFromConfig()` |
| `src/hooks/useMarketplace.ts` | Adicionar `custom_domain` à interface |
| `src/pages/c2c/C2CPublicLinksManager.tsx` | Usar domínio da config |
| `src/pages/c2c/C2CMyListings.tsx` | Usar domínio da config |
| `src/pages/c2c/C2CSellerArea.tsx` | Usar domínio da config |
| `src/pages/c2c/C2CPublicMarketplace.tsx` | Usar domínio da config |
| `src/pages/c2c/C2CPublicSellerProfile.tsx` | Usar domínio da config |
| `supabase/functions/og-proxy/index.ts` | Ler `custom_domain` da config para URLs canónicos |

Nenhuma migração necessária — as colunas `custom_domain` e `custom_domain_verified` já existem na tabela.

