

# Procurement V2 — Produtos + Sugestão de Fornecedor

## Estado actual vs. V2

O módulo V1 tem: `suppliers`, `purchase_requests/items`, `purchase_orders/items`, `goods_receipts/items`, `supplier_invoices`, `inventory_movements`. As tabelas existentes **não** têm `variant_id`, campos de sugestão de fornecedor, nem a tabela `supplier_products`. Os `products` não têm `default_supplier_id`, `avg_cost`, `last_cost`, `last_purchase_date`.

---

## 1. Migração SQL

### 1.1 Extensão a `products`
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_cost numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_cost numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_purchase_date date;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point int;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_qty int;
```

### 1.2 Nova tabela `supplier_products` (catálogo fornecedor x produto)
- `id`, `workspace_id`, `supplier_id` FK, `product_id` FK, `variant_id` FK nullable
- `supplier_sku`, `unit_price` numeric, `currency` default EUR, `min_order_qty` default 1, `pack_size` default 1
- `lead_time_days` int nullable, `last_price_date` date, `is_preferred` bool default false
- `quality_score` numeric(2,1) nullable, `reliability_score` numeric(2,1) nullable, `notes`
- UNIQUE(workspace_id, supplier_id, product_id, variant_id)
- RLS: workspace members

### 1.3 Extensão a `purchase_request_items`
```sql
ADD variant_id uuid REFERENCES product_variants(id);
ADD suggested_supplier_id uuid REFERENCES suppliers(id);
ADD suggested_unit_price numeric;
ADD suggestion_json jsonb;
ADD chosen_supplier_id uuid REFERENCES suppliers(id);
ADD chosen_unit_price numeric;
```

### 1.4 Extensão a `purchase_order_items`
```sql
ADD variant_id uuid REFERENCES product_variants(id);
```

### 1.5 Extensão a `suppliers`
```sql
ADD default_payment_terms_days int DEFAULT 30;
ADD rating_manual numeric(2,1);
```

### 1.6 Extensão a `inventory_movements`
Adicionar `unit_cost` numeric nullable e `variant_id` uuid nullable.

### 1.7 Trigger: receção actualiza avg_cost + last_cost
Substituir/melhorar o trigger existente `process_goods_receipt_item` para:
- Calcular `avg_cost = (stock * avg_cost + qty * unit_price) / (stock + qty)`
- Definir `last_cost = unit_price` e `last_purchase_date = today`

---

## 2. Edge Function: `procurement-suggest-suppliers`

Input: `{ workspace_id, items: [{ product_id, variant_id?, requested_qty }] }`

Lógica:
1. Buscar `supplier_products` para cada item
2. Para cada fornecedor candidato, calcular score 0-100:
   - Preço (35%): normalizar — melhor preço = 100
   - Lead time (20%): normalizar — menor = 100
   - Preferred (15%): `is_preferred` = 100, senão 0; + bónus +10 se `product.default_supplier_id` match
   - Reliability (15%): `reliability_score * 20`
   - Quality (15%): `quality_score * 20`
3. Ordenar por score desc, retornar top 3 com motivo
4. Se empate (diff < 5 pontos entre top 2) ou dados incompletos → chamar Lovable AI (Gemini 3 Flash) para desempatar com explicação textual

Output: `{ item_suggestions: [{ product_id, top3: [{ supplier_id, supplier_name, score, unit_price, lead_time, reason }], recommended_supplier_id, suggested_unit_price }] }`

---

## 3. Edge Function: `procurement-receive-items`

Substituir a lógica client-side de receção por edge function que:
1. Regista `goods_receipt` + `goods_receipt_items`
2. Actualiza `purchase_order_items.received_quantity`
3. Cria `inventory_movements` (type: `purchase_in`, com `unit_cost`)
4. Actualiza `products.stock_quantity`, `avg_cost`, `last_cost`, `last_purchase_date`
5. Actualiza status da PO: se todos recebidos → `received`, senão `partial`

---

## 4. UI — Formulário de Requisição V2

Refazer `PurchaseRequestForm.tsx`:
- Item picker com **autocomplete de produtos** (pesquisa por nome/SKU)
- Campo `variant_id` (se produto tem variantes)
- Botão **"Propor Fornecedor"** por item → chama edge function → mostra card com top 3 ranked
- Cada sugestão mostra: nome, preço, lead time, score, badge "Recomendado"
- Botão "Escolher este" define `chosen_supplier_id` e `chosen_unit_price`
- Opção "Definir como fornecedor padrão" (actualiza `products.default_supplier_id`)

---

## 5. Nova página: Supplier Products (Catálogo)

`src/pages/procurement/SupplierProductsPage.tsx`:
- Tabela editável inline: produto, fornecedor, preço, lead time, MOQ, pack size, preferido, scores
- Filtro por fornecedor ou produto
- Botão "Adicionar relação produto-fornecedor"

---

## 6. Actualizar Receção (GoodsReceiptsPage)

Usar a nova edge function `procurement-receive-items` em vez de inserts directos, para garantir actualização atómica de stock + custos.

---

## 7. Hook `useProcurement.ts` — Extensões

- `useSupplierProducts(workspaceId)` — CRUD para `supplier_products`
- `useSuggestSuppliers(workspaceId)` — chama edge function
- Actualizar `useGoodsReceipts` para usar edge function de receção

---

## 8. i18n

Adicionar chaves para: `suggestSupplier`, `supplierProducts`, `score`, `leadTime`, `preferred`, `recommended`, `chooseThis`, `setAsDefault`, `catalogPrice`, etc.

---

## Ficheiros a criar/modificar

| Acção | Ficheiro |
|-------|---------|
| Criar | Migração SQL (alter tables + supplier_products + trigger melhorado) |
| Criar | `supabase/functions/procurement-suggest-suppliers/index.ts` |
| Criar | `supabase/functions/procurement-receive-items/index.ts` |
| Criar | `src/pages/procurement/SupplierProductsPage.tsx` |
| Modificar | `src/hooks/useProcurement.ts` — adicionar supplier products + suggest + receive via EF |
| Modificar | `src/components/procurement/PurchaseRequestForm.tsx` — product picker + suggest UI |
| Modificar | `src/components/procurement/GoodsReceiptForm.tsx` — usar edge function |
| Modificar | `src/config/nav.v1.ts` — adicionar rota "Catálogo Fornecedores" |
| Modificar | `src/App.tsx` — rota supplier-products |
| Modificar | `supabase/config.toml` — registar 2 novas edge functions |
| Modificar | i18n files (pt/en/es/fr) |

