

# Corrigir Acesso Publico ao Marketplace C2C

## Problema 1: Marketplace nao encontrado (`/c2c/metodopare`)

A pagina publica do marketplace tenta buscar o workspace pela slug, mas a tabela `workspaces` nao tem uma politica RLS que permita utilizadores anonimos (nao logados) verem workspaces para o contexto C2C. A unica politica para `anon` exige propostas publicadas, o que nao se aplica ao marketplace.

**Solucao**: Criar uma nova politica RLS na tabela `workspaces` que permita leitura publica de workspaces que tenham listings C2C ativos, ou simplesmente permitir leitura por slug para o contexto do marketplace.

```sql
CREATE POLICY "Public can view workspace for c2c marketplace"
ON public.workspaces FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT DISTINCT workspace_id FROM c2c_listings
    WHERE status = 'active' AND moderation_status = 'approved'
  )
);
```

## Problema 2: Perfil do vendedor da 404 (`/c2c/seller/UUID`)

Nao existe rota publica para perfis de vendedores. A rota atual e `/dashboard/c2c/seller/:sellerId`, que esta dentro da area autenticada.

**Solucao**: Adicionar uma rota publica `/c2c/:workspaceSlug/seller/:sellerId` e criar uma pagina publica de perfil de vendedor (ou reutilizar a existente com adaptacoes).

### Alteracoes necessarias

1. **Migracao SQL** - Nova politica RLS na tabela `workspaces` para acesso publico via C2C
2. **Migracao SQL** - Verificar/adicionar politica RLS na tabela `c2c_sellers` para leitura publica de vendedores aprovados
3. **Nova rota em App.tsx** - Adicionar `/c2c/:workspaceSlug/seller/:sellerId`
4. **Nova pagina ou adaptacao** - Criar `C2CPublicSellerProfile.tsx` que funcione sem autenticacao, buscando o workspace pela slug em vez de depender do contexto de workspace
5. **Atualizar links** - O email de confirmacao e o perfil devem apontar para a rota publica correta

### Politica RLS adicional para c2c_sellers

```sql
CREATE POLICY "Public can view approved c2c sellers"
ON public.c2c_sellers FOR SELECT
TO anon, authenticated
USING (status = 'approved');
```

### Nova rota

```
/c2c/:workspaceSlug/seller/:sellerId
```

### Ficheiros a alterar

- **SQL**: 2 novas politicas RLS (workspaces + c2c_sellers)
- **src/App.tsx**: Adicionar rota publica para perfil de vendedor
- **src/pages/c2c/C2CPublicSellerProfile.tsx** (novo): Pagina publica do perfil do vendedor, semelhante a `C2CSellerProfile.tsx` mas sem depender de autenticacao ou contexto de workspace
- **supabase/functions/activate-c2c-seller-invite/index.ts**: Corrigir o link no email de confirmacao para usar a rota publica correta

