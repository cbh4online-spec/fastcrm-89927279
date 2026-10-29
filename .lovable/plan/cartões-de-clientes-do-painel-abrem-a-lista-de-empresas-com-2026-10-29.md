# Cartões de Clientes do painel abrem a lista de Empresas com o mesmo critério

## Problema
Os quatro cartões abrem hoje a lista de Empresas completa, apenas ordenada. O que se pretende é ver só os clientes contados em cada cartão:
- **Clientes ativos (123)**: clientes com pelo menos uma fatura emitida no mês atual.
- **Novos clientes (16)**: clientes cuja primeira fatura de sempre foi emitida no mês atual.

## O que muda
1. **Clientes ativos** e **Valor médio / cliente** abrem Empresas com o filtro «Faturados este mês».
2. **Novos clientes** e **Valor médio / novo cliente** abrem Empresas com o filtro «Novos clientes este mês», que mostra só quem faturou pela primeira vez neste mês, com os mais recentes primeiro.
3. Na lista aparece um crachá com o filtro ativo e um × para o remover.
4. O número de empresas na lista deve coincidir com o do cartão. Pode haver uma pequena diferença quando uma fatura não está ligada a nenhuma empresa, porque o painel conta esses clientes pelo nome. Nesse caso, a lista mostra a nota «X clientes sem ficha de empresa».

## Detalhes técnicos
- A função `get_companies_financials` passa a devolver `first_invoice_date`, que já é calculado. Junta-se a ele `last_invoice_date` e a contagem de faturas do mês atual (`month_invoice_count`), contando apenas faturas e notas de débito ativas. Isto exige uma nova migração que recria a função mantendo a assinatura.
- Em `CompaniesListIX`, os filtros rápidos `quick=active_month` usam `month_invoice_count > 0`, e `quick=new_month` usa `first_invoice_date` no mês atual (calendário de Lisboa). O parâmetro `sort=recent` é substituído.
- Em `IXDashboard`, os cartões passam a navegar para esses parâmetros.
- Um helper puro `isInCurrentMonth(date, now)` fica coberto por testes vitest.

## Critérios de aceitação
- Clicar em «Novos clientes 16» mostra cerca de 16 empresas, todas com a primeira fatura emitida em outubro de 2026.
- Clicar em «Clientes ativos 123» mostra só as empresas faturadas em outubro.
