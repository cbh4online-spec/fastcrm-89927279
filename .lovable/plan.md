
# Gift Cards / Cartoes Presente Digitais

## Resumo

Implementar um sistema completo de Gift Cards digitais: o admin cria cartoes presente com valores fixos ou personalizados, cada um com codigo unico. Os clientes podem compra-los na loja e usa-los como metodo de pagamento no checkout, com saldo reutilizavel ate esgotar.

---

## Como funciona

```text
Admin cria Gift Cards (valores pre-definidos: 10, 25, 50, 100 EUR)
     |
     v
Cliente compra Gift Card na loja (pagamento via Stripe)
     |
     v
Codigo unico gerado automaticamente (ex: GC-XXXX-XXXX-XXXX)
     |
     v
Cliente recebe Gift Card por email (ou copia o codigo)
     |
     v
Destinatario usa o codigo no checkout (campo ao lado do cupao)
     |
     v
Saldo e debitado do Gift Card -> se sobrar saldo, pode usar novamente
```

---

## Experiencia do Cliente

- Na loja, seccao "Cartoes Presente" acessivel pelo header
- Escolhe valor (pre-definido ou personalizado) e preenche nome/email do destinatario + mensagem opcional
- Apos pagamento, Gift Card fica ativo com codigo unico
- No checkout, campo dedicado "Tem um Gift Card?" ao lado do cupao existente
- O saldo e aplicado como desconto; se o total for menor que o saldo, o restante fica para uso futuro
- O cliente pode consultar o saldo do Gift Card a qualquer momento

## Painel Admin

- Novo separador "Gift Cards" nas configuracoes da loja
- Criar Gift Cards manuais (para oferecer a clientes)
- Ver todos os Gift Cards emitidos (codigo, saldo original, saldo restante, status, destinatario)
- Desativar/reativar Gift Cards
- Definir valores pre-configurados (ex: 10, 25, 50, 100)

---

## Seccao Tecnica

### Migracao SQL

**Tabela `store_gift_cards`:**
- `id` UUID PK
- `workspace_id` UUID FK -> workspaces
- `code` TEXT UNIQUE -- codigo unico (ex: GC-XXXX-XXXX-XXXX)
- `initial_balance` NUMERIC NOT NULL -- valor original
- `current_balance` NUMERIC NOT NULL -- saldo atual
- `currency` TEXT DEFAULT 'EUR'
- `status` TEXT DEFAULT 'active' -- active, depleted, disabled
- `purchaser_name` TEXT -- quem comprou
- `purchaser_email` TEXT -- email de quem comprou
- `recipient_name` TEXT -- destinatario
- `recipient_email` TEXT -- email do destinatario
- `message` TEXT -- mensagem pessoal
- `stripe_payment_intent_id` TEXT -- referencia Stripe (se comprado online)
- `expires_at` TIMESTAMPTZ -- validade (opcional)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

**Tabela `store_gift_card_transactions`:**
- `id` UUID PK
- `gift_card_id` UUID FK -> store_gift_cards
- `workspace_id` UUID FK -> workspaces
- `order_id` TEXT -- referencia da encomenda
- `amount` NUMERIC NOT NULL -- valor usado
- `balance_before` NUMERIC NOT NULL
- `balance_after` NUMERIC NOT NULL
- `description` TEXT -- ex: "Pagamento parcial encomenda #123"
- `created_at` TIMESTAMPTZ DEFAULT now()

**RLS:**
- Leitura publica filtrada por codigo + workspace (para verificar saldo)
- Insercao publica (para compra de Gift Cards)
- Update restrito (apenas saldo via transacoes)

### Ficheiros a criar

- `src/hooks/useStoreGiftCards.ts` -- hooks para CRUD de Gift Cards (admin) e validacao/uso (checkout)
- `src/components/store/StoreGiftCardSection.tsx` -- seccao na loja para compra de Gift Cards (escolher valor, destinatario)
- `src/components/store/StoreGiftCardBalance.tsx` -- componente para consultar saldo de Gift Card
- `src/components/store-settings/StoreGiftCardsManager.tsx` -- painel admin para gerir Gift Cards
- `src/pages/store/StoreGiftCardsPage.tsx` -- pagina publica para comprar Gift Cards

### Ficheiros a modificar

- `src/pages/store/StoreCheckoutPage.tsx` -- adicionar campo "Gift Card" ao lado do cupao, logica de saldo
- `src/components/store/StoreHeader.tsx` -- link "Cartoes Presente" no header
- `src/pages/StoreSettingsPage.tsx` -- novo separador "Gift Cards"
- `src/App.tsx` -- nova rota `/store/:workspaceSlug/gift-cards`
- `supabase/functions/create-store-checkout/index.ts` -- aplicar saldo de Gift Card no total antes de criar sessao Stripe

### Logica de Checkout com Gift Card

1. Cliente insere codigo do Gift Card no checkout
2. Frontend valida codigo e mostra saldo disponivel
3. Ao submeter, o saldo e debitado:
   - Se saldo >= total: pagamento completo via Gift Card, sem Stripe
   - Se saldo < total: saldo aplicado como desconto, restante via Stripe
4. Transacao registada em `store_gift_card_transactions`
5. `current_balance` atualizado; se chegar a 0, status muda para `depleted`

### Edge Function -- ajuste em `create-store-checkout`

- Receber `giftCardCode` no body
- Validar Gift Card e calcular valor a debitar
- Se Gift Card cobre tudo: criar encomenda diretamente (sem Stripe), debitar saldo, retornar sucesso
- Se Gift Card cobre parcialmente: debitar saldo, criar sessao Stripe com o valor restante

### Dependencias

Nenhuma nova -- utiliza componentes UI e hooks existentes
