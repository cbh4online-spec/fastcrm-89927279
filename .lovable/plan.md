

# Partner Center / Revenda B2B — Plano P0

## Diagnóstico

O FastCRM já possui infraestrutura B2B parcial via `/client/*`:
- **ClientLayout** com sidebar, branding dinâmico, permissões por role
- **client_users** / **client_user_roles** / **client_price_tiers** / **product_tier_prices**
- Hooks: useClientAuth, useClientPermissions, useClientOrders, useClientApprovals, useClientInvoices, etc.
- Rotas B2B admin: order-notes, approvals, b2b-portal settings

O PRD pede separação explícita — o Partner Center deve ser autónomo com entidades, pricing engine, e UX próprios. Vamos construir P0 como nova experiência `/partner/*` reutilizando padrões do Client Portal mas com tabelas e lógica dedicadas.

---

## Decisões de Arquitetura

1. **Novas tabelas `partner_*`** — não reutilizar `client_users` / `store_orders`
2. **PartnerLayout** — componente novo inspirado no ClientLayout mas com nav/branding B2B
3. **PartnerCartContext** — contexto separado do B2C CartContext e StoreCartContext
4. **Pricing Engine B2B** — função RPC `compute_partner_price` que segue a cascata: price_list → tier → discount
5. **Rotas `/partner/*`** separadas, registadas no App.tsx como novo bloco de rotas

---

## P0 — Escopo de Entrega

### A. Schema SQL (migration)

Criar 8 tabelas core:

```text
partner_accounts        → conta do parceiro (legal_name, vat, status, tier, price_list, credit_limit, etc.)
partner_users           → utilizadores da conta (auth_user_id, role, partner_account_id)
partner_price_lists     → listas de preços B2B
partner_price_list_items → preços por produto em cada lista
partner_tiers           → escalões (Gold, Silver, etc.) com % desconto e rebate
partner_order_headers   → encomendas B2B (status workflow, PO number, aprovação)
partner_order_items     → linhas da encomenda
partner_activity_logs   → auditoria
```

Campos adicionais em `products`:
- `b2b_published`, `b2b_visible`, `b2b_sellable`, `pvp_recommended`, `moq`, `pack_size`, `allow_backorder`, `partner_notes`

RLS: todas as tabelas com políticas por workspace_id + partner_account_id. Activity logs: SELECT para membros, INSERT via service_role.

### B. Pricing Engine

Função RPC `compute_partner_price(p_workspace_id, p_product_id, p_partner_account_id, p_quantity)` que retorna:
- `base_price`, `price_net`, `price_source`, `pvp_recommended`, `gross_margin_pct`, `tier_applied`, `list_applied`

Cascata: price_list_item → tier discount → base price.

### C. Hooks (src/hooks/partner/)

| Hook | Responsabilidade |
|---|---|
| `usePartnerAuth` | Login/sessão do parceiro (padrão useClientAuth) |
| `usePartnerAccount` | Dados da conta, crédito, tier |
| `usePartnerCatalog` | Produtos B2B publicados com preços computados |
| `usePartnerCart` | Carrinho B2B local com validação MOQ/pack |
| `usePartnerCheckout` | Submissão de encomenda com PO, aprovação |
| `usePartnerOrders` | Lista + detalhe de encomendas |
| `usePartnerDashboard` | KPIs: volume, crédito, open orders, top produtos |

### D. Páginas P0 (src/pages/partner/)

| Rota | Página |
|---|---|
| `/partner/login` | PartnerLoginPage |
| `/partner/dashboard` | PartnerDashboardPage |
| `/partner/catalog` | PartnerCatalogPage |
| `/partner/catalog/:productId` | PartnerProductDetailPage |
| `/partner/cart` | PartnerCartPage |
| `/partner/checkout` | PartnerCheckoutPage |
| `/partner/orders` | PartnerOrdersPage |
| `/partner/orders/:id` | PartnerOrderDetailPage |
| `/partner/account` | PartnerAccountPage |

### E. Layout & Componentes

- **PartnerLayout** — sidebar com nav B2B, branding workspace, indicadores de crédito/tier
- **PartnerCartContext** — provider separado
- **PartnerProductCard** — card com preço net, PVP, margem, MOQ, stock
- **PartnerOrderStatusBadge** — estados do workflow
- **PartnerCreditIndicator** — widget de crédito disponível

### F. Rotas

Novo ficheiro `src/routes/PartnerRoutes.tsx` montado em `App.tsx` sob `/partner/*`.

### G. Kernel Events

Emitir via `emitKernelEvent`:
- `PARTNER.ACCOUNT_CREATED`
- `PARTNER.ORDER_SUBMITTED`
- `PARTNER.ORDER_APPROVED`
- `PARTNER.ORDER_COMPLETED`
- `PARTNER.TIER_CHANGED`

### H. Admin (dashboard)

Novas rotas admin no CRM:
- `/dashboard/partners` — lista de contas parceiras
- `/dashboard/partners/:id` — detalhe da conta
- `/dashboard/partner-orders` — encomendas B2B
- `/dashboard/partner-price-lists` — gestão de price lists

---

## Faseamento da Implementação

Dado o volume, dividir P0 em 4 batches:

**Batch 1**: Schema SQL + migration + RLS + pricing RPC
**Batch 2**: Hooks + PartnerLayout + PartnerCartContext + rotas
**Batch 3**: Páginas parceiro (login, dashboard, catálogo, carrinho, checkout, orders)
**Batch 4**: Páginas admin (gestão de contas, price lists, orders B2B) + kernel events

---

## Critérios de Aceitação P0

- Partner login funcional com autenticação Supabase Auth
- Catálogo mostra apenas produtos com `b2b_published = true`
- Preços computados pela cascata price_list → tier → base
- MOQ e pack_size validados no carrinho
- Encomenda criada com status correcto (submitted ou awaiting_approval)
- Parceiro A não vê dados do parceiro B (RLS)
- Admin consegue criar contas, atribuir price lists e ver encomendas
- Eventos kernel emitidos nos pontos críticos

## Riscos

- Volume de tabelas muito elevado (902 existentes) — manter migrações limpas
- Possível conflito de nomes com `client_*` — nomenclatura `partner_*` evita isso
- Pricing RPC pode ter performance issues com catálogos grandes — adicionar índices adequados

