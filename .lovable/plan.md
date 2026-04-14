

# Plano: Renovação gera documento de pagamento + aparece nas faturas + alerta no Signal

## Problema Atual
1. **Faturas** — Só são criadas quando o Stripe envia `invoice.payment_succeeded`. Renovações manuais ou confirmadas sem Stripe não geram fatura.
2. **Signal** — O `CommandProactiveFeed` (sinais ativos) não inclui renovações próximas, vencidas ou com pagamento recebido.
3. **Notificações** — O webhook de renovação não cria notificações na app quando um pagamento é recebido.

## Alterações Propostas

### 1. Webhook: Adicionar notificação + kernel event no pagamento bem-sucedido
**Ficheiro:** `supabase/functions/stripe-renewal-webhook/index.ts`

No case `invoice.payment_succeeded`, após criar a fatura:
- Inserir uma **notificação** na tabela adequada (notifications ou equivalente) para o `owner_user_id` do contrato: "Pagamento recebido: [Empresa] — €X"
- Emitir um **kernel event** (`B2B.RENEWAL_PAYMENT_RECEIVED`) para alimentar o signal system

### 2. Hook de renovação manual: Gerar fatura ao confirmar renovação
**Ficheiro novo:** `src/hooks/useRenewalInvoiceGeneration.ts` (ou integrado no `useRenewals.ts`)

Criar uma mutation `useConfirmRenewal` que:
- Atualiza o status do contrato para `active`
- Avança o `next_renewal_date` para o próximo ciclo
- Chama uma edge function para gerar a fatura

**Edge function nova:** `supabase/functions/generate-renewal-invoice/index.ts`
- Recebe `contract_id`, `workspace_id`
- Gera número de fatura (`REN-YYYYMMDD-001`)
- Insere na tabela `invoices` com `renewal_contract_id` linkado
- Insere `invoice_items` a partir dos `renewal_items` ativos
- Cria notificação para o owner
- Emite kernel event `B2B.RENEWAL_INVOICE_CREATED`

### 3. Signal: Adicionar renovações ao CommandProactiveFeed
**Ficheiro:** `src/components/command-center-v2/CommandProactiveFeed.tsx`

Adicionar 2 novos tipos de signal:
- **`renewal_overdue`** (critical) — Contratos com `next_renewal_date` no passado e status `active`
- **`renewal_upcoming`** (warning) — Contratos que renovam nos próximos 7 dias

Query adicional no `queryFn`:
```
renewal_contracts WHERE workspace_id = wid 
  AND status IN ('active', 'paused')
  AND next_renewal_date <= now + 7 days
```

### 4. Botão "Confirmar Renovação" na página de detalhe
**Ficheiro:** `src/pages/RenewalDetailPage.tsx`

Adicionar um botão "Confirmar Renovação" no header que:
- Gera a fatura via edge function
- Avança a data de renovação
- Regista evento `renewed` em `renewal_events`
- Mostra toast de sucesso com link para a fatura

### Resumo de ficheiros
| Ficheiro | Ação |
|---|---|
| `supabase/functions/stripe-renewal-webhook/index.ts` | Adicionar notificação + kernel event |
| `supabase/functions/generate-renewal-invoice/index.ts` | **Nova** edge function |
| `src/components/command-center-v2/CommandProactiveFeed.tsx` | Adicionar signals de renovação |
| `src/pages/RenewalDetailPage.tsx` | Botão "Confirmar Renovação" |
| `src/hooks/useRenewals.ts` | Mutation `useConfirmRenewal` |

### Sem migrations necessárias
A tabela `invoices` já tem `renewal_contract_id`. A tabela `kernel_events` já suporta eventos genéricos. Não são necessárias alterações de schema.

