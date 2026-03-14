

## Problema

Três questões identificadas:

1. **"Vendedor não encontrado"**: A query `usePublicSellerProfile` filtra por `user_id` sem filtrar por `workspace_id`. Como o utilizador tem **2 registos de vendedor** (workspaces diferentes), `maybeSingle()` falha com erro por retornar múltiplas linhas → resultado `null` → "Vendedor não encontrado".

2. **Link com UUID longo**: O URL usa o `user_id` completo (`444ba746-3e86-...`), tornando-o pouco prático para partilha.

3. **Domínio aponta para `fastcrm.lovable.app`**: O `getPublicBaseUrl()` não reconhece o domínio customizado `fastcrm.metodopare.ai`.

## Solução

### 1. Adicionar coluna `slug` à tabela `c2c_sellers`
- Migração: `ALTER TABLE c2c_sellers ADD COLUMN slug TEXT UNIQUE`
- Gerar slugs automáticos a partir do `display_name` (slugify + sufixo curto para unicidade)
- Preencher slugs existentes via UPDATE

### 2. Corrigir `usePublicSellerProfile` em `C2CPublicSellerProfile.tsx`
- Aceitar o `workspaceId` resolvido pelo hook `usePublicMarketplaceWorkspace`
- Filtrar por `workspace_id` além de `user_id`/`slug`
- Suportar lookup por **slug** (curto) ou **user_id** (fallback UUID)

### 3. Atualizar rotas e geração de links
- A rota `/marketplace/:workspaceSlug/seller/:sellerId` continua a funcionar com UUID (fallback) mas agora também aceita slug
- `C2CSellerArea.tsx` e `C2CPublicLinksManager.tsx`: gerar link com `seller.slug` em vez de `seller.user_id`

### 4. Corrigir `getPublicBaseUrl()`
- Reconhecer `fastcrm.metodopare.ai` como domínio válido (retornar `window.location.origin`)
- Inverter a lógica: só fazer fallback para preview/dev; qualquer domínio real (incluindo custom domains) usa `window.location.origin`

### Ficheiros a editar
- **Migração SQL**: adicionar coluna `slug` + preencher dados existentes
- `src/utils/getPublicDomain.ts` — corrigir lógica de domínio
- `src/pages/c2c/C2CPublicSellerProfile.tsx` — filtrar por workspace + suportar slug
- `src/pages/c2c/C2CSellerArea.tsx` — usar slug no link público
- `src/pages/c2c/C2CPublicLinksManager.tsx` — usar slug no link do seller

### Resultado
Link final: `https://fastcrm.metodopare.ai/marketplace/metodopare/seller/jorge-cardoso`

