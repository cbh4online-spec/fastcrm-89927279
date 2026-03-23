

## Migração do Marketplace: Créditos → Subscrição Mensal

### Resumo

Eliminar o sistema de créditos para módulos e substituir por um modelo simples: módulos **incluídos no plano**, **add-ons mensais** (Stripe Subscription), **gratuitos**, ou **templates**. O custo de IA já é tratado pelo `ai-gate`.

---

### Fase 1 — Migration SQL

Adicionar campos ao schema existente e seed do catálogo:

- **`marketplace_modules`**: adicionar `pricing_model` (free/included/monthly/template), `price_eur`, `min_plan` (free/growth/pro), `stripe_price_id`, actualizar `category`
- **`marketplace_installations`**: adicionar `pricing_model`, `price_eur`, `stripe_sub_id`, `billing_cycle_start`, `billing_cycle_end`, `cancelled_at`; remover campos de créditos obsoletos (`credits_per_month`, `credits_used`, `credit_cost`, `credits_monthly`)
- **Seed UPSERT** de ~40 módulos com pricing conforme o catálogo do documento (6 add-ons mensais, ~20 incluídos, ~8 gratuitos, 4 templates)
- **Migrar instalações existentes** para o novo modelo (preencher `pricing_model` a partir do módulo)

---

### Fase 2 — Edge Functions

| Função | Acção |
|---|---|
| `extension-check` (nova) | Verifica plano vs `min_plan`, retorna `action` (install_free/install_included/subscribe_monthly) |
| `module-checkout` | Reescrever: free/included instala directo; monthly cria Stripe Checkout Session |
| `module-subscribe` | Reescrever: webhook Stripe que activa instalação pending e trata cancelamentos |
| `extension-provisioner` | Actualizar: adicionar suporte a `action: 'deprovision'` |
| `module-usage-stats` | Reescrever: retorna instalações activas e custo mensal (sem créditos) |
| `module-check-credits` | Deprecar (retorna 410) |
| `module-consume-credits` | Deprecar (retorna 410) |
| `module-purchase-credits` | Deprecar (retorna 410) |

Todas as funções novas/reescritas incluem CORS headers e auth guard padrão.

---

### Fase 3 — Hooks React

- **`src/hooks/useMarketplaceModules.ts`** (criar): query `marketplace_modules` com `is_active=true`, filtro por categoria
- **`src/hooks/useInstalledModules.ts`** (criar): chama `module-usage-stats` para obter instalações activas
- **`src/hooks/useModuleInstall.ts`** (criar): `install` chama `module-checkout` (redireciona Stripe se monthly); `uninstall` abre Stripe Portal ou desactiva directamente
- **`src/hooks/useModuleBilling.ts`**: actualizar para remover referências a créditos e usar o novo modelo
- **`src/hooks/useCreditPurchase.ts`**: actualizar para chamar `extension-check` em vez de `module-purchase-credits`

---

### Fase 4 — Stripe Products

Criar 6 produtos recorrentes no Stripe via ferramentas Stripe disponíveis:
- Portal B2B (€89/mês), Procurement (€49), Student Journey (€49), Security Ops (€49), Intermediação Crédito (€29), AI Agents (€49)

Depois actualizar `stripe_price_id` em `marketplace_modules` com os IDs reais.

---

### Fase 5 — Limpeza

- Actualizar `src/types/audit.ts` e `src/types/featureRegistry.ts` para remover referências às funções eliminadas
- Remover interfaces de créditos de módulo obsoletas

---

### Detalhes técnicos

- Migration não usa CHECK constraints com `now()` — usa defaults simples
- `extension-check` usa `workspace_plans` (tabela do ai-gate, fase anterior) para determinar plano activo
- `module-subscribe` como webhook precisa de `STRIPE_WEBHOOK_SECRET` nos secrets
- Funções deprecadas retornam HTTP 410 Gone com mensagem de redirecionamento

