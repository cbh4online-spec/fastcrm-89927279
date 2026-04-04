
# Fase 12 — Multi-pagamento & Envio

## Concluído

### 1. Métodos de Pagamento Configuráveis
- `store_settings.payment_methods` JSONB para ativar/desativar métodos ✓
- Suporte para: Cartão (Stripe), MB Way, Multibanco, Transferência Bancária ✓
- UI de configuração em Settings → Pagamentos ✓
- `store_settings.bank_transfer_details` para dados bancários (IBAN, BIC, titular) ✓

### 2. Checkout Multi-pagamento
- Picker de método de pagamento no checkout (quando >1 método ativo) ✓
- Stripe payment_method_types configurados por método (card, mbway, multibanco) ✓
- Flow de transferência bancária: cria encomenda como "awaiting_payment", exibe IBAN ao cliente ✓
- `store_orders.payment_method` regista qual método foi usado ✓

### 3. Envio (já existente, auditado)
- Tabelas `shipping_methods` e `shipping_zones` com CRUD ✓
- Cálculo de portes via edge function `calculate-shipping` ✓
- Selecção de método de envio no checkout ✓
- Campos de tracking na `store_orders` (tracking_number, carrier, url) ✓
- UI de tracking no backoffice (`StoreOrderTracking`) com notificação ✓

### 4. Página Pública de Tracking
- Rota `/store/:slug/order/:orderId` ✓
- Timeline visual com estados: Pendente → Pago → Em preparação → Enviado → Entregue ✓
- Info de tracking com link para transportadora ✓
- Morada de entrega e resumo de produtos ✓
- noindex para SEO ✓
