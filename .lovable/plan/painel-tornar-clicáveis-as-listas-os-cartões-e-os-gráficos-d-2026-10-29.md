# Painel: tornar clicáveis as listas, os cartões e os gráficos dos clientes

## O que muda (separador Clientes e Cobranças do painel)
1. **Top clientes por faturado**: clicar num cliente abre a ficha desse cliente (empresa ou contacto). Se o cliente não tiver ficha associada, abre a lista de faturas já filtrada pelo nome dele.
2. **Dependência de clientes**: clicar num nome da legenda faz o mesmo que no ponto 1.
3. **Clientes devedores** (Cobranças): clicar numa linha faz o mesmo, e o valor «Vencido» abre as faturas desse cliente com «Situação: Vencido».
4. **Gráfico «Clientes ativos»**: clicar numa barra abre as faturas desse mês, tal como no gráfico de faturação.
5. **Cartões de indicadores**:
   - «Clientes ativos» e «Valor médio / cliente» abrem a lista de Empresas.
   - «Novos clientes» e «Valor médio / novo cliente» abrem as Empresas ordenadas pelas criadas mais recentemente.
   - O mesmo comportamento em todos: cursor de mão, realce ao passar o rato e acesso pelo teclado.

## Detalhes técnicos
- `useWorkspaceFinancials`: no agrupamento por cliente, guardar o primeiro `company_id`/`contact_id` encontrado em `dependency`, `topClients` e `topDebtors`.
- Helper `clientHref({companyId, contactId, name})` com a seguinte ordem: `/dashboard/companies/:id`, depois `/dashboard/contacts/:id`, depois `/dashboard/invoices?q=<nome>`. Tem testes vitest.
- `Invoices.tsx`: a pesquisa passa a ser inicializada a partir de `?q=`.
- `ActiveClientsChart`: `onClick` em cada `Bar` usa `monthRange`, com o ano e o mês acrescentados a cada linha mensal.
- `KpiTile`: prop opcional `onClick`. Quando existe, o cartão passa a ser um `<button>` com anel de foco.

## Critérios de aceitação
- Clicar em «Formación E Imagen Profesional S.L.» abre a ficha dessa empresa.
- Clicar em SET no gráfico «Clientes ativos» abre as faturas de setembro.
- Todos os elementos clicáveis funcionam com o teclado (Tab + Enter).
