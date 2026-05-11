
# Gateways de Pagamento — Hub unificado + ifthenpay

## Diagnóstico

Já existe no projeto:
- `ifthenpay_settings` + `ifthenpay_callback_logs` (tabelas)
- Edge function `ifthenpay-callback` + hook `useIfthenpaySettings`
- Stripe ligado a planos SaaS, store e faturas (`create-checkout`, `customer-portal`, `useBillingStripe`)

Falta:
- Uma área dedicada "Gateways de Pagamento" que agregue todos os PSP do workspace.
- Fluxo completo de cobrança ifthenpay (criar pagamento MB / MBWAY / CC / Payshop / Pix, conciliar via callback).
- Plug-in de ifthenpay nos 3 contextos: faturas, checkout da store e subscrições SaaS.

## Decisões de produto/UX

1. **Hub** em `Definições → Gateways de Pagamento` com cards por gateway (Stripe, ifthenpay, + placeholder para futuros). Cada card mostra: estado (ligado/test/live), métodos ativos, último evento, ações (configurar, testar, desligar).
2. **Página detalhe ifthenpay** com tabs: *Credenciais & Métodos*, *Callback & Logs*, *Pagamentos* (lista de cobranças geradas + estado).
3. **Botão "Cobrar"** em faturas: dialog onde o operador escolhe método (MB/MBWAY/CC/Payshop/Pix) → backend cria pagamento ifthenpay → devolve referência/URL/SMS push. Estado da fatura passa a `pending_payment` até callback.
4. **Store checkout**: ifthenpay aparece como opção quando ativo no workspace (paralela ao Stripe).
5. **Subscrições SaaS (CRM)**: ifthenpay disponível para planos pagos via referência MB recorrente (geração mensal de nova ref). Cartão recorrente fica fora desta fase (ifthenpay não tem token de cartão recorrente nativo simples).
6. Tudo escopado por `workspace_id` com RLS. Apenas admins podem editar credenciais.

## Estrutura técnica

### DB (migration)
- `payment_gateways` (catálogo): `id`, `provider` (`stripe|ifthenpay|...`), `name`, `supports_recurring`, `supports_oneoff`, `methods jsonb`.
- `workspace_payment_gateways`: `workspace_id`, `provider`, `is_active`, `is_default`, `test_mode`, `display_name`, `last_health_at`, `last_health_status`. Vista unificada para o hub.
- `ifthenpay_payments`: `id`, `workspace_id`, `method` (`mb|mbway|cc|payshop|pix`), `amount`, `currency`, `order_id`, `entity`, `reference`, `request_id`, `checkout_url`, `expiry_date`, `status` (`pending|paid|expired|cancelled|error`), `paid_at`, `paid_amount`, `metadata jsonb`, `invoice_id?`, `store_order_id?`, `subscription_id?`.
- RLS: SELECT por membros do workspace; INSERT/UPDATE só admin ou service_role.
- Trigger para refletir `paid_at` → marcar fatura/order/subscription como pagas.

### Edge functions (novas)
- `ifthenpay-create-payment` — recebe `{ method, amount, order_id, invoice_id?, store_order_id?, subscription_id?, customer:{name,email,phone?} }`, valida JWT + workspace, chama API ifthenpay correta:
  - MB: `/multibanco/reference/init` (dynamic ref)
  - MBWAY: `/spg/payment/mbway`
  - CC: `/spg/payment/creditcard`
  - Payshop: `/payshop/reference`
  - Pix: `/pix/init`
- `ifthenpay-callback` (já existe) — estender para localizar `ifthenpay_payments.request_id`, atualizar estado, emitir update à entidade ligada.
- `payment-gateways-health` — pinga config de cada gateway ativo do workspace (Stripe via `accounts.retrieve`, ifthenpay via verificação local de keys).

### Frontend
- `src/pages/settings/PaymentGatewaysPage.tsx` — hub com grid de cards.
- `src/components/settings/payment-gateways/GatewayCard.tsx` — card padronizado.
- `src/components/settings/payment-gateways/StripeGatewayPanel.tsx` — usa hooks existentes.
- `src/components/settings/payment-gateways/ifthenpay/` — `CredentialsTab`, `CallbackTab`, `PaymentsTab`, `MethodsToggleGroup`.
- `src/hooks/payments/useWorkspaceGateways.ts`, `useIfthenpayPayments.ts`, `useChargeIfthenpay.ts`.
- `src/components/invoices/ChargeWithIfthenpayDialog.tsx` — botão na ficha da fatura.
- Store checkout (`StoreCheckout*`): adicionar opção "ifthenpay" + sub-seleção de método.
- SaaS billing (`BillingSettings`/`PricingCards`): nova rota `start-checkout-ifthenpay` para planos com pagamento por referência.

### Navegação
- Acrescentar entrada em `routeManifest.ts` (Definições → Faturação → Gateways de Pagamento).

## Plano de implementação (faseado)

**Fase 1 — Infraestrutura + Hub**
1. Migration: `workspace_payment_gateways`, `ifthenpay_payments`, RLS, triggers.
2. Hook `useWorkspaceGateways` + página `PaymentGatewaysPage` + cards Stripe/ifthenpay (read-only de estado).
3. Mover `IfthenpaySettings` existente para tab dentro do detalhe.

**Fase 2 — Cobranças ifthenpay**
4. Edge function `ifthenpay-create-payment` (5 métodos).
5. Estender `ifthenpay-callback` para conciliar `ifthenpay_payments` + entidade ligada.
6. Tab *Pagamentos* com lista, filtros por estado/método, reenviar MBWAY, anular.

**Fase 3 — Integração nos contextos**
7. Botão "Cobrar via ifthenpay" em faturas (dialog).
8. Opção ifthenpay no store checkout.
9. Opção ifthenpay nos planos SaaS (referência MB recorrente).

## Critérios de aceitação
- Admin vê hub com Stripe + ifthenpay e estado real.
- Admin configura ifthenpay (entidade, subentidade, keys por método, anti-phishing) e roda key.
- Operador gera pagamento por qualquer dos 5 métodos a partir de uma fatura, vê referência/URL e estado atualiza por callback.
- Cliente final escolhe ifthenpay no checkout da store; encomenda fica pendente até callback.
- Subscrição SaaS por referência MB renova mensalmente (nova ref por ciclo).
- Todas as tabelas têm RLS escopada por workspace; só service_role escreve em `ifthenpay_payments` e logs.
- Sem chaves privadas no frontend; CORS e validação zod nas edge functions.

## Riscos / por validar
- ifthenpay não suporta tokenização de cartão recorrente — SaaS recorrente via cartão fica só no Stripe.
- Pix exige conta brasileira ifthenpay — confirmar disponibilidade no workspace antes de mostrar.
- Conciliação por callback exige idempotência (chave: `request_id` + `amount`).
- Necessário decidir política quando referência MB expira sem pagamento (auto-regenerar?).

Posso avançar pela Fase 1 já a seguir?
