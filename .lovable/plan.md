## Plano: Automação de Vendas — Carrinho Abandonado + Follow-ups

### Diagnóstico

O projeto já tem infraestrutura rica para capturar dados de carrinhos:
- ✅ `store_visitor_sessions` — sessões com `cart_items`, `cart_subtotal`, `contact_id`, `converted`
- ✅ `checkout_sessions` — sessões de checkout com `customer_email`, `customer_name`, `status`
- ✅ `store-capture-lead` — captura de leads no checkout (nome, telefone, email)
- ✅ WhatsApp (Evolution API) + Email transacional + Twilio SMS configurados
- ✅ Sistema de sequências SDR existente

**O que falta:**
- ❌ **Deteção automática de carrinhos abandonados** — nenhum processo identifica sessões com carrinho que não converteram
- ❌ **Sequência de recuperação multicanal** — sem follow-ups automáticos por email/WhatsApp/SMS
- ❌ **Dashboard de carrinhos abandonados** — sem visibilidade sobre valor perdido e taxas de recuperação
- ❌ **Links de recuperação** — sem URL que recarregue o carrinho do cliente

### Implementação

#### 1. Edge Function — Detetor de Carrinhos Abandonados (`store-abandoned-cart-detector`)
Executada via pg_cron a cada 15 minutos:
- Identifica `store_visitor_sessions` com `cart_items IS NOT NULL` + `converted = false` + `last_activity_at < NOW() - interval '1 hour'` + `cart_processed = false`
- Para cada carrinho abandonado com contacto associado (`contact_id`):
  - Cria registo em nova tabela `abandoned_carts` (id, workspace_id, session_id, contact_id, cart_items, cart_value, detected_at, recovery_status, recovered_at, recovery_channel)
  - Marca `cart_processed = true` na sessão
  - Dispara a sequência de recuperação

#### 2. Edge Function — Sequência de Recuperação (`store-cart-recovery`)
Sequência multicanal em 3 toques:
- **Toque 1** (1h após abandono): Email com link de recuperação + produtos no carrinho
- **Toque 2** (6h após abandono): WhatsApp/SMS com lembrete amigável + desconto opcional
- **Toque 3** (24h após abandono): Email final com urgência ("o seu carrinho expira em 24h")

Cada toque verifica se o carrinho já foi recuperado antes de enviar.

#### 3. Página de Recuperação de Carrinho (`/store/:slug/recover/:cartId`)
- Carrega os itens do carrinho abandonado
- Preenche automaticamente o carrinho na loja
- Redireciona para o checkout com dados pré-preenchidos
- Regista a recuperação em `abandoned_carts`

#### 4. Dashboard de Carrinhos Abandonados
Nova secção em `/dashboard/store` ou tab dedicada:
- **KPIs**: Total abandonados, Valor total perdido, Taxa de recuperação, Receita recuperada
- **Lista**: Tabela com carrinhos abandonados (cliente, valor, produtos, status, canal de recuperação)
- **Filtros**: Por período, status (pendente/recuperado/expirado), canal

#### 5. Migração DB — Tabela `abandoned_carts`
Campos:
- `id` (UUID PK)
- `workspace_id` (FK workspaces)
- `session_id` (FK store_visitor_sessions)
- `contact_id` (FK contacts, nullable)
- `customer_email` (TEXT)
- `customer_name` (TEXT)
- `customer_phone` (TEXT)
- `cart_items` (JSONB)
- `cart_value` (NUMERIC)
- `currency` (TEXT, default 'EUR')
- `detected_at` (TIMESTAMPTZ)
- `recovery_status` (TEXT: 'pending', 'touch_1_sent', 'touch_2_sent', 'touch_3_sent', 'recovered', 'expired')
- `recovered_at` (TIMESTAMPTZ, nullable)
- `recovery_channel` (TEXT, nullable: 'email', 'whatsapp', 'sms', 'direct')
- `recovery_url` (TEXT)
- `touch_1_at`, `touch_2_at`, `touch_3_at` (TIMESTAMPTZ, nullable)
- `expires_at` (TIMESTAMPTZ — 48h após deteção)

RLS: workspace members only.

### Ficheiros a criar/modificar

**Novos:**
- `supabase/functions/store-abandoned-cart-detector/index.ts` — Detetor cron
- `supabase/functions/store-cart-recovery/index.ts` — Envio de toques de recuperação
- `src/pages/store/StoreCartRecoveryPage.tsx` — Página pública de recuperação
- `src/components/store/dashboard/AbandonedCartsPanel.tsx` — Dashboard
- `src/hooks/useAbandonedCarts.ts` — Hook de dados
- Migração SQL — Tabela `abandoned_carts`

**Modificados:**
- Router — Adicionar rota `/store/:slug/recover/:cartId`
- Dashboard store — Integrar painel de carrinhos abandonados

### Impacto Esperado
- **Recuperação de 5-15% dos carrinhos** abandonados (benchmark e-commerce)
- **Visibilidade** sobre valor perdido e oportunidades de otimização
- **Automação completa** — zero intervenção manual necessária