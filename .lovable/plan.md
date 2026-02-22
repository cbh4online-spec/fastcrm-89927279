

# Restringir visibilidade das pesquisas de prospecao por utilizador

## Problema

Atualmente, qualquer membro do workspace consegue ver todas as pesquisas e perfis de prospecao de todos os outros utilizadores. O Daniel consegue ver as pesquisas do Jorge e vice-versa, porque as politicas de seguranca (RLS) e os filtros no frontend apenas verificam a pertenca ao workspace, nao quem criou a pesquisa.

## Solucao

Restringir a visibilidade a dois niveis:

1. **Base de dados (RLS)**: Cada utilizador so pode ver as suas proprias pesquisas e perfis, exceto admins/owners que mantem acesso total
2. **Frontend**: Adicionar filtro por `created_by` nas queries de pesquisas e perfis

## Alteracoes

### 1. Politicas RLS na base de dados

**Tabela `professional_prospecting_searches`:**
- Substituir a politica SELECT atual (workspace member) por uma nova que verifica `created_by = auth.uid()` para utilizadores normais
- Admins/owners do workspace e super admins mantem acesso a tudo

**Tabela `professional_prospecting_profiles`:**
- Substituir a politica SELECT atual por uma que verifica se o perfil pertence a uma pesquisa criada pelo utilizador (`search_id` -> `created_by`)
- Admins/owners do workspace e super admins mantem acesso a tudo

SQL resumido:

```text
-- Searches: utilizador so ve as suas
DROP POLICY "Users can view searches in their workspace" ON professional_prospecting_searches;
CREATE POLICY "Users can view own searches or admin sees all"
  ON professional_prospecting_searches FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_workspace_admin_or_owner(auth.uid(), workspace_id)
    OR is_super_admin(auth.uid())
  );

-- Profiles: utilizador so ve perfis das suas pesquisas
DROP POLICY "Users can view profiles in their workspace" ON professional_prospecting_profiles;
CREATE POLICY "Users can view own profiles or admin sees all"
  ON professional_prospecting_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professional_prospecting_searches s
      WHERE s.id = search_id AND s.created_by = auth.uid()
    )
    OR is_workspace_admin_or_owner(auth.uid(), workspace_id)
    OR is_super_admin(auth.uid())
  );
```

### 2. Frontend - sem alteracoes necessarias

As queries no frontend ja filtram por `workspace_id`. Com as novas politicas RLS, a base de dados automaticamente filtra os resultados por utilizador, sem necessidade de alterar o codigo React.

## Resumo

| Componente | Alteracao |
|---|---|
| RLS `professional_prospecting_searches` | SELECT restrito a `created_by = auth.uid()` ou admin/owner |
| RLS `professional_prospecting_profiles` | SELECT restrito a perfis de pesquisas proprias ou admin/owner |
| Frontend | Nenhuma alteracao necessaria (RLS filtra automaticamente) |

