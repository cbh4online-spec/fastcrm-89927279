

# Auditoria Técnica — Módulo de Compras FastCRM

---

## 1. JA IMPLEMENTADO

| Area | Detalhe |
|------|---------|
| **Tabelas core** | `suppliers`, `purchase_requests`, `purchase_request_items`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `supplier_invoices`, `supplier_products`, `inventory_movements` — todas existem com RLS por workspace |
| **Campos V2 em purchase_request_items** | `variant_id`, `suggested_supplier_id`, `suggested_unit_price`, `suggestion_json`, `chosen_supplier_id`, `chosen_unit_price` — todos presentes no schema |
| **Campos V2 em purchase_order_items** | `variant_id` presente |
| **Campos V2 em suppliers** | `default_payment_terms_days`, `rating_manual` presentes |
| **Campos V2 em inventory_movements** | `unit_cost`, `variant_id` presentes |
| **supplier_products** | Tabela completa com `unit_price`, `lead_time_days`, `min_order_qty`, `pack_size`, `is_preferred`, `quality_score`, `reliability_score`, unique index, RLS |
| **Edge Function: procurement-suggest-suppliers** | Implementada com scoring determinístico (35% preço, 20% lead, 15% pref, 15% reliability, 15% quality) + AI tiebreaker via Gemini |
| **Edge Function: procurement-receive-items** | Implementada — cria receipt, items, actualiza PO status |
| **config.toml** | Ambas EFs registadas com `verify_jwt = false` |
| **Hook useProcurement.ts** | CRUD completo para suppliers, requests, orders, receipts, invoices, supplier_products, suggest suppliers, KPIs |
| **UI PurchaseRequestForm** | Product autocomplete, suggest supplier button, SupplierSuggestionCard com top 3, choose/set default |
| **UI GoodsReceiptForm** | Usa edge function `procurement-receive-items` |
| **UI SupplierProductsPage** | Catálogo editável com CRUD |
| **Trigger po_number** | Auto-geração PO-YYYY-XXXXX |
| **i18n** | PT, EN, ES, FR com namespace `procurement` |

---

## 2. PARCIALMENTE IMPLEMENTADO

| Area | Problema |
|------|---------|
| **Trigger V2 (process_goods_receipt_item_v2)** | O código SQL existe na migração mas **usa colunas erradas** para `inventory_movements`: escreve `movement_type`, `quantity`, `reference_type`, `reference_id` mas a tabela real tem `type`, `qty`, `source`, `ref_id`. O trigger **FALHA silenciosamente** ou dá erro na execução |
| **Campos em products** | A migração V2 tentou adicionar `avg_cost`, `last_cost`, `default_supplier_id`, `last_purchase_date`, `reorder_point`, `reorder_qty` mas **NENHUM destes campos existe** no schema actual (types.ts confirma). A migração provavelmente falhou |
| **PurchaseOrderForm** | Formulário V1 — usa descrição livre, sem `product_id` picker, sem `variant_id`, não ligado a produtos |
| **usePurchaseRequests.create** | Não envia `variant_id`, `suggested_supplier_id`, `suggestion_json`, `chosen_supplier_id`, `chosen_unit_price` para a DB — campos descartados no insert |
| **GoodsReceiptForm callback** | Chama edge function mas depois não invalida queries correctamente (usa `onSave` callback do pai que faz insert directo redundante) |

---

## 3. NÃO IMPLEMENTADO

| Area | Impacto |
|------|---------|
| **Edge Function: procurement-create-po-from-request** | Não existe. Não há forma de converter Request aprovada em PO(s) agrupadas por fornecedor |
| **Conversão Request → PO na UI** | Botão "Gerar PO" após aprovação não existe |
| **avg_cost / last_cost / last_purchase_date** na tabela products | Colunas não existem — custo médio não é calculado nem armazenado |
| **default_supplier_id** na tabela products | Coluna não existe — sugestão de fornecedor padrão não persiste |
| **reorder_point / reorder_qty** na tabela products | Colunas não existem — sem alertas de reposição |
| **Índices de performance** | `supplier_products` sem índice em `(product_id)`, `(supplier_id)`. POs sem índice em `(workspace_id, status)` |
| **Audit trail / timeline** | Sem componente PurchaseTimeline, sem log de alterações de estado |
| **ApprovalWorkflow component** | Referenciado no plano, nunca criado |
| **PDF de PO** | Mencionado no plano, não implementado |
| **Role-based access** | RLS é só workspace membership — Agent pode aprovar requests (deveria ser só Owner/Admin) |

---

## 4. BUGS POTENCIAIS (CRÍTICOS)

### BUG 1 — Trigger V2 vai crashar na receção
O trigger `process_goods_receipt_item_v2` faz:
```sql
INSERT INTO inventory_movements (workspace_id, product_id, movement_type, quantity, unit_cost, reference_type, reference_id)
```
Mas as colunas reais são: `type`, `qty`, `source`, `ref_id`. **Resultado: erro PostgreSQL na receção, transação falha, stock não actualiza.**

### BUG 2 — Campos em products não existem
O trigger V2 faz `UPDATE products SET avg_cost = ..., last_cost = ..., last_purchase_date = ...` mas essas colunas não existem. **A migração V1 das extensões a products falhou silenciosamente.**

### BUG 3 — Dois triggers concorrentes no mesmo evento
Existe `process_goods_receipt_item` (V1) e `process_goods_receipt_item_v2` (V2) — o V2 faz DROP do V1, mas se o V2 falhou a instalar, o V1 pode estar activo. O V1 **não calcula avg_cost** nem `last_cost`.

### BUG 4 — usePurchaseRequests.create descarta campos V2
O hook envia items com `product_id`, `description`, `quantity`, `estimated_unit_price` mas ignora `variant_id`, `suggested_supplier_id`, `suggestion_json`, `chosen_supplier_id`, `chosen_unit_price` — dados da sugestão perdem-se.

### BUG 5 — GoodsReceiptForm duplo-insert
O componente chama a edge function E depois o `onSave` do pai que faz `create(values)` — potencial inserção duplicada de receipt.

### BUG 6 — Race condition na receção
A edge function e o trigger correm em paralelo sem transacção única. Receções simultâneas podem corromper `received_quantity` e `stock_quantity`.

### BUG 7 — PurchaseOrderForm sem product_id
Cria items com `description` livre — sem referência a produto. Quebra o princípio "produtos são fonte de verdade".

---

## 5. RECOMENDAÇÕES PRIORITÁRIAS (Ordem de execução)

1. **Migração SQL correctiva** — Adicionar colunas em falta a `products` + corrigir trigger V2 com nomes de colunas correctos
2. **Fix usePurchaseRequests.create** — Enviar todos os campos V2 (variant_id, chosen_supplier_id, etc.)
3. **Fix GoodsReceiptForm** — Remover insert directo duplicado, usar apenas edge function
4. **Criar procurement-create-po-from-request** — Edge function que agrupa items por chosen_supplier_id e cria POs
5. **Refazer PurchaseOrderForm** — Product picker em vez de descrição livre
6. **Adicionar índices** — `supplier_products(product_id)`, `supplier_products(supplier_id)`, `purchase_orders(workspace_id, status)`
7. **Corrigir race condition** — Usar `SELECT ... FOR UPDATE` no trigger ou edge function para serializar receções
8. **Role-based approval** — Verificar role (owner/admin) antes de permitir approve/reject

---

## 6. LISTA EXACTA DE ACÇÕES TÉCNICAS

### Migração SQL
```
1. ALTER TABLE products ADD COLUMN IF NOT EXISTS default_supplier_id uuid REFERENCES suppliers(id)
2. ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_cost numeric DEFAULT 0
3. ALTER TABLE products ADD COLUMN IF NOT EXISTS last_cost numeric DEFAULT 0
4. ALTER TABLE products ADD COLUMN IF NOT EXISTS last_purchase_date date
5. ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point int
6. ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_qty int
7. CREATE OR REPLACE FUNCTION process_goods_receipt_item_v2() — com colunas correctas: type, qty, source, ref_id
8. CREATE INDEX idx_supplier_products_product ON supplier_products(product_id)
9. CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id)
10. CREATE INDEX idx_purchase_orders_ws_status ON purchase_orders(workspace_id, status)
11. CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(order_id)
```

### Edge Functions
```
12. Criar supabase/functions/procurement-create-po-from-request/index.ts
13. Registar em config.toml
```

### Hooks (useProcurement.ts)
```
14. Fix usePurchaseRequests.create — incluir variant_id, suggested_supplier_id, suggestion_json, chosen_supplier_id, chosen_unit_price no insert
15. Fix usePurchaseOrders.create — adicionar product_id e variant_id ao item input
16. Adicionar hook useConvertRequestToPO que chama a nova edge function
```

### Components
```
17. Fix GoodsReceiptForm — remover callback onSave duplicado, usar apenas edge function + invalidar queries manualmente
18. Refazer PurchaseOrderForm — product picker com autocomplete, variant_id, remover descrição livre
19. Adicionar botão "Gerar PO" na PurchaseRequestsPage para requests aprovadas
20. Criar PurchaseTimeline component (audit trail visual)
```

### Segurança
```
21. Adicionar verificação de role (owner/admin) na action approve/reject de requests
22. Adicionar FOR UPDATE no trigger para prevenir race conditions
```

