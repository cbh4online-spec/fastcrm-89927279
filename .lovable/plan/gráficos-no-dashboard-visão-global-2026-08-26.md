# Gráficos no Dashboard (Visão Global)

## Diagnóstico
O `IXDashboard` (Visão Global) hoje só tem KPIs em cartões e listas de texto — não existe nenhum gráfico em nenhuma das 5 secções (Faturação, Cobranças, Clientes, Itens, Impostos). As referências enviadas mostram exatamente o que falta: barras comparativas por ano, aging da dívida, dependência de clientes, top itens e IVA mensal.

## O que vai ser construído

### Faturação
- Gráfico de barras mensal (JAN–DEZ) com comparação dos 3 anos (ano atual + 2 anteriores), ano atual destacado a verde.
- Cartões laterais mantidos: Hoje, Este mês, Este trimestre, Este ano, com variação % vs período homólogo.

### Cobranças
- Cartões Total / Não vencido / Vencido com cores semânticas (neutro, amarelo, vermelho).
- Gráfico de barras "Envelhecimento da dívida" por mês (recebido / não vencido / vencido).
- Tabela "Clientes devedores" com valores não vencido e vencido.

### Clientes
- Barra horizontal empilhada "Dependência de clientes" (% de faturação por cliente, top 9 + Outros) com legenda.
- Gráfico de barras "Clientes ativos" por mês (novos vs recorrentes).
- KPIs: total de clientes ativos, novos clientes, valor médio por cliente, valor médio por novo cliente.

### Itens
- Gráfico de barras horizontais "Top 5 itens" (por unidades vendidas), agregado a partir das linhas de fatura.
- KPIs: itens vendidos e valor médio por item, com variação.
- Gráfico de barras "Evolução de venda de unidades" nos últimos 12 meses.

### Impostos
- Alternador Trimestral / Mensal.
- Cartões dos últimos períodos de IVA.
- Gráfico de barras de IVA por mês do ano corrente.
- Mantém o detalhe por taxa já existente.

## Detalhes técnicos
- Biblioteca de gráficos: `recharts`, já usado no projeto (ex.: `src/components/reports/sales/*`), com os wrappers de `@/components/ui/chart`.
- Novos componentes em `src/components/dashboard/ix/` (um ficheiro por gráfico) para manter o `IXDashboard.tsx` legível.
- Dados: reutilizar `useInvoices` / `useInvoiceStats` / `useCollectionCases` já ligados na página, e `useWorkspaceFinancials` para as séries históricas por ano. Para itens é necessária uma agregação por linhas de fatura (`invoice_items`) — hook novo `useInvoiceItemsAggregate` com agregação por mês e por produto, filtrada por workspace e por documentos ativos.
- Cores exclusivamente por tokens do design system (sem hex diretos), compatíveis com tema escuro.
- Estados tratados em todos os gráficos: loading (skeleton), vazio (mensagem) e erro.
- Responsivo: gráficos em `ResponsiveContainer`, grelhas colapsam para 1 coluna em mobile.

## Critérios de aceitação
- Cada uma das 5 secções tem pelo menos um gráfico com dados reais do workspace ativo.
- Totais dos gráficos batem certo com os KPIs apresentados na mesma secção.
- Sem erros de consola; comportamento correto em mobile e tema escuro.

## Por validar
- Comparação de anos na Faturação: usar valores sem IVA (subtotal), em linha com a convenção financeira do projeto.
