

## Plano: Domínio Personalizado por Workspace para Marketplace e Loja

### Problema Atual
O sistema está preso a domínios hardcoded (`vendesimples.com` para marketplace, `fastcrm.metodopare.ai` para loja). Cada workspace que queira o seu próprio domínio fica dependente destes defaults, mesmo já tendo o campo `custom_domain` na configuração.

### Arquitectura Proposta

Cada workspace configura o seu `custom_domain` no backoffice. O sistema usa esse domínio para gerar URLs públicos. Se não tiver domínio próprio, usa o domínio principal do projecto (`fastcrm.metodopare.ai`).

```text
Workspace A (custom_domain: "meumercado.pt")
  → marketplace: https://meumercado.pt/marketplace/slug-a
  → loja:        https://meumercado.pt/store/slug-a

Workspace B (sem custom_domain)
  → marketplace: https://fastcrm.metodopare.ai/marketplace/slug-b
  → loja:        https://fastcrm.metodopare.ai/store/slug-b
```

### Alterações Necessárias

**1. `src/utils/getPublicDomain.ts`**
- `getMarketplaceBaseUrl()` passa a devolver `getPublicBaseUrl()` (domínio principal) em vez de `vendesimples.com` hardcoded
- `getMarketplaceBaseUrlFromConfig()` mantém a lógica: se há `custom_domain`, usa-o; senão, fallback para o domínio principal

**2. `supabase/functions/og-proxy/index.ts`**
- Remover constante `MARKETPLACE_URL` hardcoded
- Para rotas `/marketplace/`, fazer lookup na tabela `marketplace_configs` para obter o `custom_domain` do workspace e gerar o `og:url` correto dinamicamente

**3. `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx`**
- Atualizar as instruções DNS para explicar claramente que:
  - O domínio customizado é **opcional** — sem ele, usa o domínio principal
  - Para funcionar, o domínio tem de ser adicionado em **Project Settings → Domains** no Lovable (pelo super admin)
  - Os registos DNS (A + TXT) são necessários apenas para domínios próprios

**4. `src/components/store-settings/sections/StoreIdentitySettings.tsx`**
- Atualizar o fallback do prefixo da URL: quando não há `custom_domain`, mostrar `getPublicBaseUrl()` em vez de `fastcrm.metodopare.ai` hardcoded

**5. `src/pages/c2c/C2CPublicLinksManager.tsx`**
- Já usa `getMarketplaceBaseUrlFromConfig()` — funcionará automaticamente após a alteração no ponto 1

### Passo Operacional (Manual)
Para cada domínio customizado de workspace funcionar com SSL:
- O **super admin** precisa adicionar o domínio em **Project Settings → Domains → Connect Domain** no Lovable
- Isto não pode ser automatizado via código — é uma acção na plataforma Lovable

### Ficheiros Afectados
1. `src/utils/getPublicDomain.ts` — remover hardcode `vendesimples.com`
2. `supabase/functions/og-proxy/index.ts` — lookup dinâmico de domínio
3. `src/pages/dashboard/marketplace/MarketplaceConfigPage.tsx` — instruções actualizadas
4. `src/components/store-settings/sections/StoreIdentitySettings.tsx` — fallback dinâmico

