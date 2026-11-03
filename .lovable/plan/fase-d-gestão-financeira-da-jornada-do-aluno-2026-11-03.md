# Fase D — Gestão financeira da Jornada do Aluno

## Diagnóstico
- A base já existe (Fase A): prestações, ligações inscrição–fatura e cálculo separado de contratado / pago / faturado / vencido / em aberto.
- O separador Financeiro da ficha do aluno só mostra estes valores. Não é possível editar o plano de pagamento, registar pagamentos nem associar faturas.
- Não existe uma vista global de cobranças da Jornada.

## O que vai ser possível fazer
1. **Valores da inscrição**: editar o valor base, o desconto e o valor final acordado, com o motivo do desconto.
2. **Plano de pagamento**: escolher pagamento único ou em N prestações, com a data da primeira e a periodicidade. O sistema gera as prestações, que podem ser ajustadas uma a uma. A soma tem de ser igual ao valor acordado.
3. **Registar pagamento**: indicar o valor, a data, o método e uma referência. Aceita pagamentos parciais e associa cada pagamento a uma prestação.
4. **Associar documentos financeiros**: pesquisar uma fatura existente do mesmo cliente (filtrada por NIF ou contacto) e indicar o valor atribuído. Nenhum documento fiscal é emitido automaticamente.
5. **Estado financeiro automático**: Sem plano, Em dia, Parcial, Em atraso ou Liquidado. É calculado a partir das prestações e nunca a partir do estado da inscrição.
6. **Nova página «Financeiro» na Jornada**:
   - KPIs: contratado, pago, faturado, vencido e em aberto.
   - Tabela de prestações com pesquisa, filtros (estado, curso, edição, intervalo de vencimento), ordenação e paginação.
   - Atalhos «Vence nos próximos 7 dias» e «Em atraso».
7. **Alerta de vencimento**: alerta no painel para prestações que vencem nos próximos 7 dias (calendário de Lisboa). O lembrete ao aluno é apenas assistido e nunca enviado de forma automática.

## Permissões
- Só utilizadores com as funções gestão ou financeiro (ou donos e administradores) veem ou editam esta informação. Esta regra é aplicada na base de dados e no ecrã.
- Cada alteração fica registada no histórico de auditoria: quem fez, o quê, quando, e os valores antigos e novos.

## Detalhes técnicos
- Lógica pura em `enrollmentFinance.ts`: `buildInstallmentPlan`, `allocatePayment` e `deriveFinancialStatus`, com testes para pagamento parcial, arredondamentos, fatura repetida e pró-forma.
- Migração:
  - tabela `sj_enrollment_payments` (workspace_id, installment_id, valor, data, método, referência, criado por) com GRANTs, RLS `sj_has_any_role` e trigger que atualiza `paid_amount` e `financial_status`;
  - trigger de mesmo workspace nas ligações a faturas e auditoria em `activity_logs`.
- Ações feitas por RPCs transacionais: `sj_set_payment_plan` (valida a soma) e `sj_register_payment`. O cliente nunca escreve diretamente o `paid_amount`.
- A página `SJFinance.tsx` entra no menu através de `routeManifest.ts` e lê os dados de forma paginada, por causa do limite de 1000 linhas por pedido.
- As datas são calculadas com `lisbonDays.ts`.

## Critérios de aceitação
- Um pagamento parcial de 100 € numa prestação de 300 € deixa 200 € em aberto e o estado «Parcial».
- Uma fatura associada duas vezes conta uma só vez. Pró-formas e faturas anuladas não contam.
- Uma inscrição paga sem fatura associada mostra 0 € faturado.
- Um utilizador sem função financeira não vê valores nem na ficha nem na página.

## Riscos / por validar
- As prestações históricas só chegam com a Fase F (importação dos ficheiros).
- Métodos de pagamento propostos: MB Way, transferência, numerário, cartão e Stripe.
