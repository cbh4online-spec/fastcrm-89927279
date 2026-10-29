# Clicar no gráfico «Envelhecimento da dívida» abre as faturas desse mês

## O que muda
1. **Barras clicáveis.** Cada parte da barra abre a lista de faturas do mês de emissão correspondente:
   - **Recebido (azul)**: faturas desse mês com dinheiro recebido.
   - **Não vencido (amarelo)**: faturas desse mês por pagar, ainda dentro do prazo.
   - **Vencido (vermelho)**: faturas desse mês por pagar, com o prazo ultrapassado.
   Ao passar o rato aparece «clique para ver as faturas».
2. **Novo filtro na lista de faturas: «Situação»** (Recebido / Não vencido / Vencido). Funciona com o período e é mostrado num crachá com ×, tal como o «Período». Este filtro usa o valor em dívida e a data de vencimento. Não usa o estado gravado na fatura, que hoje indica «Vencidas 0» mesmo quando há faturas vencidas.
3. **Valores alinhados com o gráfico.** O gráfico passa a ignorar notas de crédito e recibos, como já acontece no total em dívida. Assim, a soma do vermelho num mês corresponde à lista aberta.

## Detalhes técnicos
- `useWorkspaceFinancials`: cada linha `aging` passa a ter `year` e `month`. O bucket só conta documentos `invoice`/`debit_note` e salta as cópias V já cobertas pelo SAF-T (a mesma regra que é usada na dívida).
- `AgingChart`: `onClick` em cada `Bar` → `/dashboard/invoices?from&to&due=paid|not_due|overdue`, com `monthRange`.
- `Invoices.tsx`: lê `due` da URL e filtra no cliente. `paid` = amount_paid > 0. `not_due`/`overdue` = (total − amount_paid) > 0,005, comparando due_date com hoje (dias Europe/Lisbon via `lisbonDays`) e excluindo notas de crédito. Mostra um crachá removível. «Limpar filtros» remove também `due`.
- Helper puro `matchesDueFilter(inv, filter, today)` com testes vitest: vencida, dentro do prazo, paga, nota de crédito excluída.

## Critérios de aceitação
- Clicar no vermelho de JUL abre só as faturas de julho com dívida vencida, e o total em dívida da lista coincide com o valor da barra.
- Clicar no azul de SET mostra as faturas de setembro com pagamentos.
- Remover os crachás volta a mostrar a lista completa.
