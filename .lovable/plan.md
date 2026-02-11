
# Corrigir Perfil Publico do Vendedor - RLS Policy

## Problema identificado

A pagina mostra "Marketplace nao encontrado" porque a politica RLS na tabela `workspaces` so permite acesso anonimo quando o workspace tem anuncios ativos com moderacao aprovada. Como o Strongadget ainda nao tem anuncios, o workspace fica invisivel para visitantes anonimos.

A politica atual e:
```text
"Public can view workspace for c2c marketplace"
-> workspace visivel SE existir c2c_listings com status='active' E moderation_status='approved'
```

Como nao ha listings aprovados no workspace `metodopare`, a query ao workspace falha e a pagina mostra o erro.

## Solucao

Expandir a politica RLS para tambem permitir acesso ao workspace quando existem vendedores aprovados (mesmo sem anuncios). Isto garante que perfis publicos de vendedores funcionam independentemente de terem anuncios.

## Alteracoes tecnicas

### 1. Atualizar a RLS policy na tabela `workspaces`

Substituir a politica "Public can view workspace for c2c marketplace" por uma versao expandida que inclui workspaces com vendedores aprovados:

```sql
DROP POLICY "Public can view workspace for c2c marketplace" ON workspaces;

CREATE POLICY "Public can view workspace for c2c marketplace" ON workspaces
FOR SELECT USING (
  id IN (
    SELECT DISTINCT workspace_id FROM c2c_listings
    WHERE status = 'active' AND moderation_status = 'approved'
  )
  OR
  id IN (
    SELECT DISTINCT workspace_id FROM c2c_sellers
    WHERE status = 'approved'
  )
);
```

### 2. Verificar acesso

Apos aplicar a migracao, testar o link publico para confirmar que a pagina do vendedor carrega corretamente.

Nenhum ficheiro de codigo precisa de ser alterado - o problema e exclusivamente de permissoes na base de dados.
