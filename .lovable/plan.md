

# Registar Pagamentos Totais e Parciais em Faturas

## Problema Atual
O botão "Marcar como Paga" apenas marca a fatura como totalmente paga de uma vez. Não existe forma de registar pagamentos parciais nem histórico de pagamentos.

## Solução

### 1. Nova tabela `invoice_payments`
Tabela para registar cada pagamento individual associado a uma fatura:

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| invoice_id | UUID FK → invoices | |
| workspace_id | UUID FK → workspaces | |
| amount | NUMERIC | Valor do pagamento |
| payment_date | DATE | Data do pagamento |
| payment_method | TEXT | Método (transferência, MB, etc.) |
| reference | TEXT | Referência/comprovativo |
| notes | TEXT | Observações |
| created_by | UUID | Utilizador que registou |
| created_at | TIMESTAMPTZ | |

RLS: Acesso restrito por `workspace_id` ao utilizador autenticado.

Adicionar status `partially_paid` à fatura — quando `amount_paid > 0` mas `< total`.

### 2. Componente `RegisterPaymentDialog`
Dialog com formulário para registar pagamento:
- Campo valor (pré-preenchido com saldo em dívida)
- Data do pagamento
- Método de pagamento (select)
- Referência opcional
- Notas opcionais
- Botão "Pagamento Total" que preenche automaticamente o valor em falta

### 3. Componente `InvoicePaymentsHistory`
Lista de pagamentos registados numa fatura, visível na página de detalhe:
- Data, valor, método, referência
- Barra de progresso de pagamento (pago vs total)

### 4. Hook `useInvoicePayments`
- `useInvoicePayments(invoiceId)` — lista pagamentos
- `useRegisterPayment()` — insere pagamento + actualiza `amount_paid` e `status` na fatura
- Lógica: se `amount_paid >= total` → status `paid`; se `amount_paid > 0` → status `partially_paid`

### 5. Alterações em ficheiros existentes

| Ficheiro | Alteração |
|---|---|
| Migração SQL | Criar tabela `invoice_payments`, adicionar `partially_paid` ao check de status |
| `src/hooks/useInvoicePayments.ts` | Novo hook |
| `src/components/invoices/RegisterPaymentDialog.tsx` | Novo componente |
| `src/components/invoices/InvoicePaymentsHistory.tsx` | Novo componente |
| `src/pages/InvoiceDetail.tsx` | Integrar dialog e histórico; substituir botão "Marcar como Paga" por "Registar Pagamento" |
| `src/pages/Invoices.tsx` | Adicionar badge `partially_paid`; opção no dropdown |
| `src/hooks/useInvoices.ts` | Adicionar `partially_paid` ao tipo `InvoiceStatus` |
| Ficheiros i18n (pt/en/es) | Novas chaves para pagamentos |

