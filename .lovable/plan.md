

## Fluxo de Compra de Créditos com Stripe

### O que já existe
- Tabelas `credit_packages`, `credit_purchases`, `credit_wallets`, `credit_ledger` no schema
- Edge function `module-purchase-credits` que cria sessões Stripe Checkout (referencia `credit_packages`)
- Hook `useCreditWallet` com saldo, ledger e consumo
- Tab "Créditos" no módulo Funis com `CreditLedgerPanel`
- `STRIPE_SECRET_KEY` configurada

### O que falta
1. **Produtos Stripe para créditos** — criar 3 pacotes no Stripe
2. **Seed dos pacotes** na tabela `credit_packages` com `stripe_price_id`
3. **Edge function para confirmar pagamento** — após checkout sucesso, creditar wallet e registar purchase
4. **Configuração da edge function** no `config.toml`
5. **UI de compra** — componente `CreditPurchasePanel` com cards de pacotes e botão comprar
6. **Integração na tab Créditos** — substituir conteúdo da tab por wallet + pacotes + ledger
7. **Hook `useCreditPurchase`** — lógica de compra e verificação de pagamento

### Plano de implementação

**1. Criar 3 produtos Stripe**
- 50 Créditos — 9,90€
- 200 Créditos — 29,90€ (mais popular)
- 500 Créditos — 59,90€ (melhor valor)

**2. Inserir pacotes na tabela `credit_packages`** com os `stripe_price_id` correspondentes

**3. Criar edge function `verify-credit-purchase`**
- Recebe `sessionId` do Stripe Checkout
- Verifica pagamento via `stripe.checkout.sessions.retrieve`
- Se pago: insere em `credit_purchases`, actualiza saldo em `credit_wallets` (upsert), regista no `credit_ledger`
- Protecção de idempotência via `stripe_payment_intent_id`

**4. Actualizar `config.toml`** — adicionar `verify_jwt = false` para `module-purchase-credits` e `verify-credit-purchase`

**5. Criar hook `useCreditPurchase`**
- Busca pacotes de `credit_packages`
- Função `purchaseCredits(packageId)` — invoca `module-purchase-credits`, redireciona para Stripe
- Função `verifyPurchase(sessionId)` — invoca `verify-credit-purchase` após retorno
- Detecção de `?purchase=success` na URL para trigger automático de verificação

**6. Criar componente `CreditPurchasePanel`**
- 3 cards de pacotes com preço, créditos, preço/crédito, badge "Mais popular"
- Botão "Comprar" em cada card
- Estado de loading durante redirect
- Design premium dark consistente

**7. Refactoring da tab Créditos em `FunnelsList.tsx`**
- Topo: `CreditWalletBadge` expandido com saldo + botão "Comprar Créditos"
- Meio: `CreditPurchasePanel` com os 3 pacotes
- Base: `CreditLedgerPanel` com histórico

### Ficheiros

| Acção | Ficheiro |
|-------|---------|
| Criar | 3 produtos + preços Stripe (via tool) |
| Inserir | Dados em `credit_packages` (via insert tool) |
| Criar | `supabase/functions/verify-credit-purchase/index.ts` |
| Editar | `supabase/config.toml` (2 entries) |
| Criar | `src/hooks/useCreditPurchase.ts` |
| Criar | `src/components/funnels/credits/CreditPurchasePanel.tsx` |
| Editar | `src/components/funnels/credits/index.ts` (export) |
| Editar | `src/components/funnels/FunnelsList.tsx` (tab créditos) |
| Editar | `src/components/funnels/credits/CreditWalletBadge.tsx` (botão comprar) |

