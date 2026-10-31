# FastCRM Quality AI — Auditar e corrigir o Painel inicial

Modo: correção controlada. Área: `/dashboard` (Visão Global IX, `IXDashboard.tsx`, 516 linhas, 5 separadores e atalhos; o painel semanal antigo só abre com `?nav=legacy` e fica fora do âmbito).

## 1. Inventário
- Separadores, cartões e números, atalhos (`clientHref`, `clientInvoicesHref`) e os dados que os alimentam: `useDashboardInvoices`, `computeInvoiceStats`, `useWorkspaceFinancials`, `useInvoiceItemsAggregate`, `useCollectionCases`, consulta de rendas, top clientes e IVA por taxa.
- Registar o que já funciona e tem de continuar a funcionar.

## 2. Funcionalidade e dados
- Confirmar as regras do projeto: valores pagos via `amount_paid`, ND somadas no total a pagar, leitura paginada acima de 1000 faturas, datas em Europe/Lisbon e dados só do workspace atual.
- Comparar alguns números do painel com consultas só de leitura à base de dados (PHARLISS e METODOPARE).
- Verificar carregamento, painel vazio, erros, cada atalho até à lista certa e a troca de workspace sem dados antigos.

## 3. Segurança
- Confirmar que as consultas filtram pelo workspace e que as regras de acesso às tabelas usadas o garantem; verificar quem pode ver custos/margens.

## 4. Visual
- Capturas reais em 390x844, 768x1024 e 1440x900 (incluindo a parte de baixo da página e cada separador): cortes, alinhamentos, contraste, foco, scroll horizontal, nomes dos botões só com ícone.

## 5. Correções
- Só mudanças pequenas e reversíveis na área do painel (P0–P3 por ordem).
- Mudanças nas regras de acesso, cálculos de negócio ou base de dados: proponho primeiro e peço autorização.

## 6. Validação e relatório
- Repetir cada problema depois da correção, correr os testes existentes do painel/finanças, confirmar que a app compila sem erros e voltar a tirar capturas.
- Relatório no formato da habilidade: achados (ID, prioridade, evidência, ficheiro, impacto, estado), correções, testes feitos e por fazer, pontuação só das partes avaliadas e veredito.

## Limitações conhecidas
- Testes com sessão real dependem de uma conta com acesso aos workspaces; se faltar, digo exatamente o que ficou por verificar.
