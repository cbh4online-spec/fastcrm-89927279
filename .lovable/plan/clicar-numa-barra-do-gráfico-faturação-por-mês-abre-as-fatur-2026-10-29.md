# Clicar numa barra do gráfico «Faturação por mês» abre as faturas desse mês

## Situação atual
- As barras do gráfico do painel ainda não reagem ao clique.
- A lista de faturas só filtra por estado. Não tem filtro por mês ou datas.

## O que muda
1. **Gráfico clicável**: cada barra (ano + mês) leva o cursor de mão e mostra um tooltip «Ver faturas de Set 2025». O clique abre `/dashboard/invoices?from=2025-09-01&to=2025-09-30`.
2. **Lista de faturas com filtro de período**:
   - Lê `from`/`to` do endereço e mostra só as faturas emitidas nesse intervalo (data de emissão, calendário de Lisboa).
   - Mostra um crachá «Período: Setembro 2025 ×». Ao clicar no ×, o filtro sai e a lista volta a ser a completa.
   - Funciona em conjunto com o filtro de estado e a pesquisa já existentes.
   - Os totais mostrados no topo passam a refletir o período escolhido.
3. **Coerência com o gráfico**: o gráfico conta só faturas e recibos, sem IVA. A lista mostra todos os documentos do período. Por isso, acrescento uma nota curta: «O gráfico considera só faturas e recibos, sem IVA».

## Detalhes técnicos
- `FaturacaoYearChart` (IXDashboard): `onClick` nas `Bar` do recharts → `navigate` com o primeiro e o último dia do mês.
- `Invoices.tsx`: `useSearchParams` para `from`/`to` (validados por regex `YYYY-MM-DD`), filtro `issue_date >= from && <= to` no memo de filtragem existente, e crachá com botão para remover o filtro.
- Teste vitest para o helper `monthRange(year, month)` (fevereiro e anos bissextos, dezembro).

## Critérios de aceitação
- Clicar em SET 2025 abre a lista só com faturas de 01–30/09/2025.
- Remover o crachá mostra novamente todas as faturas.
- `?status=paid&from=…` combina os dois filtros.
