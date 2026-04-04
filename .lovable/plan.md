
# Fase 13 — Notificações de Encomenda por Email

## Concluído

### 1. Templates de Email Transacional (React Email)
- `order-confirmation` — Confirmação de encomenda com total e resumo de produtos ✓
- `order-shipped` — Encomenda enviada com nº tracking, transportadora e link de rastreio ✓
- `order-delivered` — Confirmação de entrega concluída ✓

### 2. Triggers Automáticos
- Confirmação de encomenda: enviada no `stripe-webhook` após pagamento confirmado ✓
- Encomenda enviada: enviada no `StoreOrderTracking` ao guardar tracking ✓
- Encomenda entregue: enviada no `useUpdateStoreOrderStatus` ao marcar como "delivered" ✓

### 3. Substituição de Edge Functions Inexistentes
- `send-order-status-notification` → `send-transactional-email` (template `order-delivered`) ✓
- `send-tracking-notification` → `send-transactional-email` (template `order-shipped`) ✓

### 4. Nota
- Domínio de email (`notify.fastcrm.metodopare.ai`) com DNS falhado — emails ficam em fila até verificação DNS concluída
