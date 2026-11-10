# Corrigir botão «Novo Orçamento» na Visão Global

## Diagnóstico
- Não é falta de módulo. O atalho leva a `/dashboard/proposals/new`, mas não existe página de criação: o endereço cai na ficha de orçamento e procura um orçamento com id «new», que não existe — nada acontece.
- A criação real é feita pelo diálogo `CreateProposalDialog`, aberto dentro da lista de orçamentos.

## Alterações
1. `ProposalsList.tsx`: ler `?new=1` do URL; se presente, abrir o diálogo de criação e limpar o parâmetro (para não reabrir ao voltar atrás).
2. `IXDashboard.tsx`: atalho passa a `/dashboard/proposals?new=1`.
3. `SalesAssetsRoutes.tsx`: adicionar rota `/dashboard/proposals/new` que redireciona para `/dashboard/proposals?new=1` (protege links antigos noutros sítios).
4. Procurar outros links para `proposals/new` e alinhá-los.

## Critérios de aceitação
- Clicar «Novo Orçamento» abre a lista de orçamentos com o diálogo de criação aberto.
- Fechar o diálogo não o reabre; voltar atrás funciona.
- Permissões existentes do diálogo mantêm-se.

## Verificação
- Playwright com sessão real: clicar o atalho e confirmar o diálogo visível, sem erros de consola.
