
# Fase 12 — Multi-pagamento & Envio

## 1. Tabela de Métodos de Envio (shipping_methods)
- Criar tabela `shipping_methods` com: workspace_id, name, description, base_price, free_above (valor mínimo para portes grátis), estimated_days_min/max, zones (JSONB para zonas geográficas com preços), is_active, position
- RLS por workspace_id

## 2. Tabela de Zonas de Envio (shipping_zones)
- Alternativa simplificada: campo `zones` JSONB dentro de shipping_methods com array de {zone_name, countries[], price}
- Ou tabela separada se necessário escalar

## 3. Métodos de Pagamento na Store
- Adicionar campo `payment_methods` (JSONB) à tabela `store_settings` ou `workspaces` para configurar quais métodos aceitar
- Suportar: Stripe (cartão), MB Way, Multibanco, Transferência Bancária
- Para MB Way/Multibanco: integração via Stripe (se disponível) ou Eupago/ifthenpay

## 4. Checkout Flow Melhorado
- Selecção de método de envio no checkout
- Cálculo dinâmico de portes baseado na zona do cliente
- Selecção de método de pagamento
- Resumo com subtotal + portes + total

## 5. Tracking de Envios
- Adicionar campos à tabela `orders`: shipping_method_id, tracking_number, tracking_url, shipping_status (pending, shipped, in_transit, delivered)
- UI no backoffice para adicionar tracking number
- UI na store para o cliente ver estado do envio

## 6. Gestão no Backoffice
- CRUD de métodos de envio (Settings → Envio)
- Configuração de métodos de pagamento aceites
- Gestão de tracking numbers nas encomendas

## Decisões a validar com utilizador
- Quais métodos de pagamento específicos? (Stripe apenas? MB Way? Multibanco?)
- Gateway de pagamento para MB Way/Multibanco (Stripe PT, Eupago, ifthenpay)?
- Zonas de envio: Portugal Continental, Ilhas, Europa, Resto do Mundo?
