# Ativar Marketplace C2C em todos os workspaces e simplificar menu

## Objetivo

Garantir que o botão **Marketplace C2C** do FastCRM aparece sempre ativo no menu lateral (estilo IX), para todos os workspaces existentes e futuros, mostrando apenas a entrada principal e ocultando as sub-rotas do sidebar.

## O que vai mudar

1. **Ativar o módulo em todos os workspaces existentes**
   - Migration SQL que insere `workspace_modules` com o módulo `marketplace-c2c` (`0e13b213-5b7c-4acc-8c06-79f159c945b3`) em todos os workspaces que ainda não o têm.
   - `subscribed_by` será o `owner_id` de cada workspace; status `active`; datas de início/periodo com `now()`.

2. **Ativar o módulo automaticamente em novos workspaces**
   - Alterar a função `public.create_workspace_with_owner` para, logo após criar o workspace, inserir o módulo `marketplace-c2c` em `public.workspace_modules` com `subscribed_by = auth.uid()`.

3. **Mostrar apenas o botão principal no menu lateral**
   - Em `src/config/routeManifest.ts`, todas as sub-rotas do grupo `marketplace-c2c` passam a ter `visibleInSidebar: false`.
   - A rota principal `c2c` ("/dashboard/c2c") mantém `visibleInSidebar: true`.
   - As sub-rotas mantêm `visibleInSearch: true` para continuar acessíveis pela pesquisa global ⌘K e por URL direto.

## Ficheiros a alterar

- `supabase/migrations/<timestamp>_activate_marketplace_c2c_all_workspaces.sql` (migration nova)
- `src/config/routeManifest.ts`

## Critérios de aceitação

- [ ] O módulo `marketplace-c2c` fica ativo nos 12 workspaces existentes (10 sem instalação atual).
- [ ] Novos workspaces criados via `create_workspace_with_owner` já têm o módulo ativo.
- [ ] No menu lateral IX aparece apenas **Marketplace C2C** (rota principal) dentro do grupo Aplicações.
- [ ] Sub-rotas como "Meus Anúncios", "Vendedores", "Encomendas", etc., não aparecem na sidebar.
- [ ] As sub-rotas continuam a funcionar por URL direto e pela pesquisa global.
- [ ] Build passa sem erros de TypeScript.
