

## Dunning Automático + Ligação à Faturação nos Contratos de Renovação

### O que vai ser implementado

Quando um pagamento Stripe falha, o sistema escala automaticamente: envia emails de aviso ao cliente (1ª, 2ª, 3ª tentativa), aumenta o nível de risco do contrato e, após 3 falhas consecutivas, cancela automaticamente o contrato e a subscrição Stripe. Os pagamentos recebidos criam faturas automáticas no módulo de faturação.

---

### Parte 1: Lógica de Dunning no Webhook

**Ficheiro: `supabase/functions/stripe-renewal-webhook/index.ts`**

No handler `invoice.payment_failed`:
- Contar tentativas falhadas consecutivas (query `renewal_payment_events` com `event_type = 'payment_failed'` para o contrato)
- Escalar `risk_level`: 1ª falha → `medium`, 2ª → `high`, 3ª → `critical`
- Na 3ª falha: cancelar subscrição Stripe via API (`stripe.subscriptions.cancel`) e marcar contrato como `churned`
- Enviar email de alerta ao cliente em cada falha via `renewal-alert-email`

### Parte 2: Emails de Pagamento Falhado

**Ficheiro: `supabase/functions/renewal-alert-email/index.ts`**

Adicionar tipos de alerta `payment_failed_1`, `payment_failed_2`, `payment_failed_3` e `service_cancelled`:
- 1ª falha: "O seu pagamento falhou. Por favor atualize o método de pagamento."
- 2ª falha: "Segunda tentativa falhada. O serviço será suspenso em breve."
- 3ª falha: "Serviço cancelado por falta de pagamento."

Cada email inclui: nome da empresa, valor, link para atualizar pagamento (Stripe Customer Portal).

### Parte 3: Cancelamento Automático

No webhook, após 3 falhas:
1. `stripe.subscriptions.cancel(subscriptionId)`
2. `renewal_contracts.status = 'churned'`
3. `workspace_subscriptions.status = 'cancelled'`
4. Registar evento `subscription_cancelled` em `renewal_payment_events`
5. Enviar email de cancelamento ao cliente e notificação ao owner

### Parte 4: Ligação à Faturação

**Ficheiro: `supabase/functions/stripe-renewal-webhook/index.ts`**

No handler `invoice.payment_succeeded`:
- Criar fatura automática na tabela `invoices` com:
  - `company_id` e `contact_id` do contrato
  - `invoice_number` gerado (formato REN-YYYYMMDD-SEQ)
  - `status: 'paid'`, `paid_at: now`
  - `total` = valor do pagamento Stripe
- Criar `invoice_items` com os itens do contrato de renovação
- Guardar referência `stripe_invoice_id` nas `notes` da fatura

**Ficheiro: `src/components/renewals/RenewalBillingTab.tsx`**

- Adicionar secção "Faturas" que lista faturas associadas ao contrato (query `invoices` por `company_id` ou nova coluna `renewal_contract_id`)
- Cada fatura clicável navega para `/dashboard/invoices/:id`

### Parte 5: UI de Dunning

**Ficheiro: `src/components/renewals/RenewalBillingTab.tsx`**

- Mostrar banner de aviso quando há pagamentos falhados recentes
- Badge "Dunning" com contagem de falhas no cabeçalho da subscrição
- Eventos de falha com ícone vermelho na lista de movimentos

**Ficheiro: `src/hooks/useRenewalAlerts.ts`**

- Adicionar tipo de alerta `payment_failed` aos alertas de renovação
- Mostrar contratos com pagamentos falhados nos alertas do dashboard

### Migração SQL

- Adicionar coluna `dunning_attempts` (integer, default 0) a `renewal_contracts`
- Adicionar coluna `renewal_contract_id` (uuid, nullable, FK) a `invoices` para ligação direta

### Resumo de ficheiros

| Ficheiro | Ação |
|---|---|
| `supabase/functions/stripe-renewal-webhook/index.ts` | Dunning + criação de faturas + cancelamento auto |
| `supabase/functions/renewal-alert-email/index.ts` | Templates de email para falhas de pagamento |
| `src/components/renewals/RenewalBillingTab.tsx` | UI dunning + secção faturas |
| `src/hooks/useRenewalAlerts.ts` | Alerta payment_failed |
| Migração SQL | `dunning_attempts` + `renewal_contract_id` |

### Fluxo completo

```text
Stripe: payment_failed
  → webhook recebe evento
  → conta tentativas falhadas (1, 2, 3)
  → escala risk_level (medium → high → critical)
  → envia email ao cliente (aviso 1/2/3)
  → se 3ª falha:
      → cancela subscrição Stripe
      → marca contrato churned
      → envia email de cancelamento
      → notifica owner

Stripe: payment_succeeded
  → webhook recebe evento
  → reset dunning_attempts = 0
  → cria fatura no módulo invoices
  → regista movimento
```

