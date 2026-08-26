# Ativar Faturas no menu Vendas (myMYA Hub)

## Diagnóstico

O menu **Faturas** existe e está registado no manifesto de rotas em `vendas`, mas está condicionado ao módulo `invoices` ("Finance Pack"). No workspace **myMYA Hub** o único módulo ativo é `fastclub`, logo a barra lateral esconde a entrada (a mesma razão pela qual **Propostas** também não aparece). Os restantes itens de Vendas (Importar SAF-T, Cobranças, Renting, Notas de Encomenda, Pagamentos, Funis) não têm gating de módulo, por isso continuam visíveis.

Verificado: `workspace_modules` do myMYA Hub tem apenas `fastclub` (ativo); `marketplace_modules` tem `invoices` = "Finance Pack" (ativo, 19€/mês) e `proposals` = "Proposals Pack".

## O que vou fazer

1. Ativar o módulo **Finance Pack** (`invoices`) no workspace myMYA Hub, com estado `active`, através de uma operação de dados na tabela `workspace_modules` (sem alterações de código nem de esquema).
2. Ativar também **Proposals Pack** (`proposals`), já que Propostas está escondida pelo mesmo motivo e faz par com Faturas no fluxo de venda. Se preferires manter Propostas desativado, diz e removo este passo.
3. Confirmar por consulta que os módulos ficam listados como ativos para o workspace.

## Nota técnica

- Nenhum ficheiro de código é alterado: `src/config/routeManifest.ts` já define `invoices` em `vendas` e `InvoiceXpressSidebar.tsx` passa a mostrar a entrada assim que o módulo constar em `workspace_modules`.
- A lista de módulos é cacheada 5 minutos no cliente (`useWorkspaceModules`), por isso pode ser necessário recarregar a página para o menu aparecer.

## Critérios de aceitação

- Em myMYA Hub, o grupo **Vendas** mostra **Faturas** e abre `/dashboard/invoices` sem erro.
- **Propostas** aparece igualmente (se mantido o passo 2).
- Restantes workspaces não são afetados.

## Riscos

- O módulo é pago (19€/mês no catálogo). Esta ativação é feita diretamente no workspace, sem passar pelo fluxo de subscrição/Stripe — se quiseres que passe pelo marketplace/pagamento, indica e ajusto a abordagem.
