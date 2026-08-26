# Loja Online ativa mas invisível no menu — correção

## Diagnóstico (verificado)

- O módulo `online-store` está mesmo **ativo** no workspace "Moveis Baratos" (o `marketplace-c2c` está `canceled`).
- O workspace tem dono (`loja@moveispinheiro.pt`) mas **zero registos em `workspace_members`**.
- O menu lateral obtém os módulos instalados através da função `module-usage-stats`, que exige pertença em `workspace_members`. Sem membro, devolve erro → a lista de módulos fica vazia → **todas** as entradas dependentes de módulo (Loja Online, Marketplace, Faturas, Propostas…) desaparecem da barra lateral.
- A página do Marketplace de módulos usa outra consulta (direta à base), por isso mostra "Loja Online — Desativar" enquanto o menu não mostra nada.

## Correções propostas

1. **Backfill de membros (base de dados)**
   - Inserir o `owner_id` como membro `owner` em `workspace_members` para todos os workspaces sem qualquer membro (inclui "Moveis Baratos").
   - Garantir que a função `create_workspace_with_owner` cria sempre a linha de membro do dono (verificar e corrigir se em falta).

2. **Função `module-usage-stats` mais tolerante**
   - Aceitar também: dono do workspace (`workspaces.owner_id = user.id`) e super admin.
   - Deixar de responder 500 em caso de erro: devolver 200 com `installations: []` e um campo `error`/`fallback`, para o cliente distinguir "sem módulos" de "falha".

3. **Barra lateral resiliente**
   - Em `InvoiceXpressSidebar` (e restantes sidebars que usam `useInstalledModules`), quando o carregamento de módulos falhar ou ainda estiver a decorrer, não esconder silenciosamente os grupos dependentes de módulo — mostrar o estado de carregamento e, em caso de erro, não aplicar o filtro por módulo (evita menus vazios por falha de rede).

## Ficheiros a alterar

- Migração SQL (backfill `workspace_members` + revisão de `create_workspace_with_owner`)
- `supabase/functions/module-usage-stats/index.ts`
- `src/hooks/useInstalledModules.ts` (expor `isError`)
- `src/components/layout/InvoiceXpressSidebar.tsx` (usar `isError`/`isLoading` no filtro)

## Critérios de aceitação

- "Loja Online" aparece na secção Aplicações do menu do workspace Moveis Baratos.
- Faturas/Propostas e outros itens dependentes de módulo voltam a aparecer quando os módulos estão ativos.
- Workspaces sem membros deixam de existir; novos workspaces ficam sempre com o dono como membro.
- Uma falha temporária da função de módulos já não esvazia o menu.

## Riscos

- O backfill toca em `workspace_members`: apenas insere onde não existe qualquer membro, sem alterar registos existentes.
- Tornar o filtro tolerante a erros pode mostrar temporariamente um menu de módulo não instalado; as páginas continuam protegidas por RLS e pelos guards de rota.
