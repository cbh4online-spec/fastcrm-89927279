

## Sistema de Recuperação de Carrinhos Abandonados — Plano de Execução

### Diagnóstico

**O que já existe e funciona:**
- `store_abandoned_carts` — tabela com `session_id`, `items`, `subtotal`, `customer_email`, `customer_name`, `recovery_status`, `recovery_attempts`, `recovered_order_id`
- `detect-abandoned-carts` — edge function que processa `store_visitor_sessions` inativas (30min) e cria registos em `store_abandoned_carts`
- `store-cart-abandonment` — edge function que cria `store_automation_events` e marca carrinhos como `contacted`
- `store-webhook` — já marca carrinhos como `recovered` quando uma encomenda é paga (por email/contact_id)
- `store-capture-lead` — já cria/atualiza `store_abandoned_carts` quando lead é capturada no checkout
- `useStoreAutomation.ts` — hooks de leitura/escrita para carrinhos abandonados
- `StoreCartsTab` — painel com KPIs e listagem (apenas read-only)
- `RecoverCartPage` — existe mas usa `checkout_abandoned_carts` (sistema de checkout funnels, **não** da loja online)

**O que falta:**
1. `store_abandoned_carts` não tem `recovery_token`, `customer_phone`, `device_type`, `contacted_at`, `contact_channel`
2. Não existe página de recuperação para a **loja online** (apenas para checkout funnels)
3. Não existe rota `/store/:workspaceSlug/recover/:token`
4. `StoreCartsTab` não tem ações (gerar link, copiar, contactar, ver detalhe)
5. `store_orders` não tem `abandoned_cart_id` para rastreio de origem
6. Não existe mecanismo de restore do carrinho via token
7. Não existe detalhe individual do carrinho abandonado

---

### FASE I — Migration SQL

**Alterar `store_abandoned_carts`** — adicionar campos:
- `recovery_token TEXT UNIQUE` — token seguro (crypto.randomUUID)
- `recovery_token_expires_at TIMESTAMPTZ`
- `customer_phone TEXT`
- `device_type TEXT`
- `referrer TEXT`
- `contacted_at TIMESTAMPTZ`
- `contact_channel TEXT` — 'email', 'whatsapp', 'phone', 'manual'
- `recovered_at TIMESTAMPTZ`
- `recovered_value NUMERIC(12,2)`

**Alterar `store_orders`** — adicionar campo:
- `abandoned_cart_id UUID REFERENCES store_abandoned_carts(id) ON DELETE SET NULL`

**Índice:** `idx_store_abandoned_carts_token ON store_abandoned_carts(recovery_token)`

---

### FASE A — Melhorar deteção (`detect-abandoned-carts`)

**Alterar** `supabase/functions/detect-abandoned-carts/index.ts`:
- Copiar `customer_phone`, `device_type`, `referrer` da sessão para o registo abandonado
- Gerar `recovery_token` (UUID) com `recovery_token_expires_at` (7 dias)
- Logging `[STORE-ABANDONED]`

---

### FASE B — Página de recuperação da loja

**Criar** `src/pages/store/StoreRecoverCartPage.tsx`:
- Recebe `:workspaceSlug` e `:token` dos params
- Consulta `store_abandoned_carts` pelo `recovery_token` (via edge function para segurança)
- Valida expiração
- Mostra itens do carrinho, subtotal, aviso se produtos indisponíveis
- Botão "Continuar Compra" → restaura carrinho via zustand store e redireciona para checkout
- Se token inválido/expirado → mensagem clara

**Criar** `supabase/functions/store-recover-cart/index.ts`:
- Recebe `token` + `workspaceSlug`
- Valida token, expiração, workspace
- Retorna items, subtotal, workspace_id
- Regista evento `recovery_link_opened` em `store_automation_events`
- Nunca expõe dados de outro workspace

**Adicionar rota** em `src/routes/StoreRoutes.tsx`:
- `<Route path=":workspaceSlug/recover/:token" element={<StoreRecoverCartPage />} />`

---

### FASE C — Restore do carrinho

Dentro de `StoreRecoverCartPage`:
- Valida cada produto contra a DB (via dados retornados pela edge function)
- Produtos inativos/sem stock → aviso visual, não adiciona
- Produtos válidos → `addItem` no zustand store
- Regista `cart_restored` em `store_automation_events`
- Redireciona para `/store/:workspaceSlug/checkout`

---

### FASE D — Ações no painel `StoreCartsTab`

**Alterar** `src/components/store/StoreCartsTab.tsx`:

Adicionar por cada carrinho abandonado:
1. **Gerar/copiar link** — gera token se não existir, copia URL
2. **Marcar contactado** — atualiza `recovery_status`, `contacted_at`, `contact_channel`
3. **Marcar recuperado** — manual override
4. **Marcar expirado** — manual override
5. **Ver detalhe** — abre drawer/dialog

Usar `DropdownMenu` com ações no card existente (sem destruir layout).

---

### FASE E — Detalhe do carrinho abandonado

**Criar** `src/components/store/StoreAbandonedCartDetail.tsx`:

Dialog/Sheet com:
- Dados do visitante (nome, email, telefone)
- Itens com quantidades e preços
- Subtotal
- Device type, referrer
- Recovery status + timeline
- Link de recuperação (com botão copiar)
- Encomenda recuperada (se existir, com link)

---

### FASE F — Associação à encomenda recuperada

**Alterar** `supabase/functions/create-store-checkout/index.ts`:
- Aceitar `abandonedCartId` opcional no payload
- Gravar em `store_orders.abandoned_cart_id`
- Incluir no metadata do Stripe session

**Alterar** `supabase/functions/store-webhook/index.ts` (bloco store):
- Quando `metadata.abandoned_cart_id` existe:
  - Atualizar `store_abandoned_carts`: `recovery_status='recovered'`, `recovered_at`, `recovered_value`, `recovered_order_id`

**Alterar** `StoreCheckoutPage.tsx`:
- Ler `?recover=<token>` do URL
- Se presente, enviar `abandonedCartId` no payload do checkout

---

### FASE G — Automação V1

**Alterar** `supabase/functions/detect-abandoned-carts/index.ts`:
- Após criar registo abandonado com token, emitir evento `recovery_link_created` em `store_automation_events` com payload preparado (email, phone, recovery_url)
- Isto fica pronto para futura integração com email/WhatsApp campaigns

---

### FASE H — Tracking e métricas

Eventos registados em `store_automation_events`:
- `abandoned_cart_created` — na deteção
- `recovery_link_created` — na deteção (com token)
- `recovery_link_opened` — na edge function de recover
- `cart_restored` — na página de recuperação
- `abandoned_cart_recovered` — no webhook (pagamento confirmado)
- `abandoned_cart_marked_contacted` — no painel (manual)
- `abandoned_cart_expired` — no job de expiração existente

---

### Ficheiros a criar (3)
1. `src/pages/store/StoreRecoverCartPage.tsx`
2. `src/components/store/StoreAbandonedCartDetail.tsx`
3. `supabase/functions/store-recover-cart/index.ts`

### Ficheiros a alterar (6)
1. `src/components/store/StoreCartsTab.tsx` — ações por carrinho
2. `src/routes/StoreRoutes.tsx` — nova rota recover
3. `src/pages/store/StoreCheckoutPage.tsx` — ler `?recover=` e enviar `abandonedCartId`
4. `supabase/functions/detect-abandoned-carts/index.ts` — copiar phone/device, gerar token
5. `supabase/functions/create-store-checkout/index.ts` — aceitar `abandonedCartId`
6. `supabase/functions/store-webhook/index.ts` — marcar recovered com `abandoned_cart_id`

### Migrations (1)
- Novos campos em `store_abandoned_carts` + `abandoned_cart_id` em `store_orders` + índice

### Compatibilidade
- `RecoverCartPage` existente (checkout funnels) permanece intacta
- `checkout_abandoned_carts` não é afetada
- Layout do `StoreCartsTab` mantido, apenas adicionadas ações
- Build funcional validado no final

