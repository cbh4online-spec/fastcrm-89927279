
# Fix: Erro ao inserir Avatar/Logotipo no Hero

## Problema

Ao clicar em "Avatar" ou "Logotipo" no bloco Hero, o update falha porque a politica de seguranca (RLS) da tabela `bio_blocks` so permite operacoes a membros do workspace (`workspace_members`). O utilizador e super_admin mas nao esta registado como membro do workspace "Be a leader", por isso o UPDATE devolve 0 linhas e o erro aparece.

A politica actual e:
```
"Workspace members can manage bio_blocks" (ALL)
-> workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
```

## Solucao

Actualizar a politica RLS de `bio_blocks` para tambem permitir acesso a super admins, da mesma forma que ja foi corrigido para `bio_events` e `bio_analytics_daily`.

## Alteracao

Uma migracao SQL que:

1. Remove a politica actual "Workspace members can manage bio_blocks"
2. Cria nova politica que permite acesso a membros do workspace OU super admins

### Detalhe Tecnico

```sql
DROP POLICY IF EXISTS "Workspace members can manage bio_blocks" ON public.bio_blocks;

CREATE POLICY "Workspace members or super admins can manage bio_blocks"
ON public.bio_blocks FOR ALL
USING (
  is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);
```

### Resultado

Super admins conseguem alterar o tipo de media (Icone/Avatar/Logotipo) e todas as outras propriedades dos blocos Bio em qualquer workspace, sem erros.
