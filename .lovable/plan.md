

## Pagamentos de Renovação Recorrentes com Ligação SaaS

### Contexto atual

- A Edge Function `create-renewal-payment-link` usa `mode: "payment"` (one-off)
- Os contratos têm `renewal_interval` (monthly, quarterly, semi_annual, yearly, custom)
- A tabela `renewal_payment_links` guarda links criados com status
- A tabela `workspace_subscriptions` já guarda `stripe_subscription_id`, `stripe_customer_id`, `plan`, `status`, MRR
- Não existe tracking de movimentos de pagamento individuais

---

### Parte 1: Subscrição Stripe Recorrente

**Edge Function `create-renewal-payment-link`:**

1. Mudar `mode: "payment"` → `mode: "subscription"` 
2. Usar `price_data` com `recurring.interval` mapeado do `renewal_interval` do contrato:
   - monthly → month
   - quarterly → month + interval_count: 3
   - semi_annual → month + interval_count: 6
   - yearly → year
3. Criar/reutilizar Stripe Customer pelo email do contacto
4. Guardar `stripe_subscription_id` quando a sessão completar

**Schema (migração):**

- Adicionar coluna `stripe_subscription_id` à tabela `renewal_contracts`
- Adicionar coluna `stripe_customer_id` à tabela `renewal_contracts`
- Criar tabela `renewal_payment_events` para registar movimentos:
  - `id`, `workspace_id`, `contract_id`, `stripe_event_id`, `event_type` (payment_succeeded, payment_failed, subscription_created, subscription_cancelled), `amount`, `currency`, `stripe_invoice_id`, `metadata`, `created_at`

### Parte 2: Persistência e UI

**Tab Faturação (`RenewalBillingTab.tsx`):**

- Após criar link, mostrar URL copiável e estado
- Adicionar secção "Movimentos" que lista `renewal_payment_events`
- Mostrar badge com estado da subscrição Stripe (ativa/cancelada)

### Parte 3: Webhook para Tracking de Movimentos

**Nova Edge Function `stripe-renewal-webhook`:**

- Escuta eventos: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- Em `checkout.session.completed`: extrai `contract_id` dos metadata, guarda `stripe_subscription_id` e `stripe_customer_id` no contrato
- Em `invoice.payment_succeeded`: insere registo em `renewal_payment_events`, atualiza status do contrato
- Em `invoice.payment_failed`: regista evento, altera risk_level do contrato

### Parte 4: Ligação ao SaaS

**Quando o pagamento é recebido:**

- A webhook actualiza `workspace_subscriptions` do workspace METODOPARE com o `stripe_customer_id` e dados de subscrição
- O `total_mrr` do contrato alimenta as métricas SaaS existentes (OverviewSection, BillingSection)
- A ligação é feita via `workspace_id` do contrato → `workspace_subscriptions.workspace_id`

### Resumo de ficheiros

| Ficheiro | Ação |
|---|---|
| `supabase/functions/create-renewal-payment-link/index.ts` | Alterar para mode: subscription |
| `supabase/functions/stripe-renewal-webhook/index.ts` | Criar (nova) |
| Migração SQL | Adicionar colunas + tabela renewal_payment_events |
| `src/components/renewals/RenewalBillingTab.tsx` | Mostrar movimentos e estado da subscrição |

### Notas técnicas

- O `price_data` com `recurring` é necessário porque os itens de renovação são dinâmicos (não têm Price ID fixo no Stripe)
- A webhook precisa de `verify_jwt = false` no config.toml
- O segredo `STRIPE_WEBHOOK_SECRET` será necessário para validar a assinatura da webhook

