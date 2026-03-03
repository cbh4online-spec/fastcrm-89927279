

# Supplier Price Importer — Plano de Implementação

## Resumo

Criar um importador de tabelas de preços de fornecedores com stepper de 4 passos, suporte a 6 modos de pricing, matching automático com produtos, e commit atómico para `supplier_products`. Inclui 2 novas tabelas, extensão a `supplier_products`, 3 edge functions, storage bucket, e UI completa.

---

## 1. Migração SQL

### 1.1 Criar `supplier_price_imports`
- `id`, `workspace_id`, `supplier_id` FK, `file_url`, `file_name`, `file_type` (xlsx/csv)
- `pricing_mode` text (NET_PRICE_ONLY, RRP_ONLY, NET_AND_RRP, DISCOUNT_GLOBAL, DISCOUNT_BY_CATEGORY, MARGIN_RULE)
- `currency` default EUR, `global_discount_percent` nullable, `margin_percent` nullable, `base_price_field` text nullable
- `price_is_per_pack` boolean default false
- `mapping_json` jsonb, `stats_json` jsonb, `category_discounts_json` jsonb nullable
- `status` text (uploaded, parsed, validated, committed, failed)
- `created_by` uuid, `created_at` timestamptz
- RLS: workspace members only

### 1.2 Criar `supplier_price_import_rows`
- `id`, `workspace_id`, `import_id` FK (cascade delete), `row_index` int
- `raw_json` jsonb, `normalized_json` jsonb
- `match_status` text (matched, unmatched, needs_review)
- `product_id` nullable FK, `variant_id` nullable FK
- `computed_unit_price` numeric nullable, `computed_rrp_price` numeric nullable
- `error_text` text nullable
- RLS: workspace members only
- Index on `(import_id, match_status)`

### 1.3 Extensão a `supplier_products`
```sql
ADD rrp_price numeric nullable
ADD price_source text nullable  -- net, rrp, computed, discount
ADD import_id uuid nullable REFERENCES supplier_price_imports(id)
ADD barcode text nullable
ADD category text nullable
```

### 1.4 Storage bucket
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-price-files', 'supplier-price-files', false);
```
Com RLS policy para workspace members.

---

## 2. Edge Functions

### 2.1 `supplier-import-parse`
- Input: `{ import_id }`
- Download ficheiro do Storage, parse CSV (standard) ou XLSX (usando SheetJS/xlsx npm)
- Retorna colunas detectadas + 20 sample rows
- Guarda status `parsed`

### 2.2 `supplier-import-validate`
- Input: `{ import_id, mapping_json, pricing_mode, global_discount_percent, margin_percent, base_price_field, price_is_per_pack, category_discounts_json }`
- Para cada row: normaliza campos via mapping, calcula `computed_unit_price` e `computed_rrp_price` conforme pricing_mode
- Matching com produtos: 1) barcode/EAN, 2) supplier_sku match em supplier_products, 3) product_name exact match
- Insere rows em `supplier_price_import_rows` com match_status
- Retorna stats (total, matched, unmatched, errors)

### 2.3 `supplier-import-commit`
- Input: `{ import_id }`
- Lê rows validadas com match_status=matched
- UPSERT em `supplier_products` por (workspace_id, supplier_id, product_id, variant_id)
- Actualiza: unit_price, rrp_price, pack_size, min_order_qty, lead_time_days, last_price_date, import_id, barcode, category, price_source, supplier_sku
- Batch de 250 rows
- Actualiza import status → committed + stats_json

---

## 3. UI / Componentes

### 3.1 Nova página: `src/pages/procurement/SupplierPriceImportPage.tsx`
- Rota: `/dashboard/procurement/price-import`
- Nav entry no grupo Compras

### 3.2 Componente principal: `SupplierPriceImportWizard`
4 steps:
1. **Upload** — Selecionar fornecedor, ficheiro, pricing_mode, moeda, opções (desconto global, margem, base_price_field, price_is_per_pack). Upload para Storage. Chama `supplier-import-parse`.
2. **Column Mapping** — Reutilizar padrão visual do `ColumnMappingStep` existente mas com campos de pricing (supplier_sku, barcode, product_name, net_price, rrp_price, discount_percent, pack_size, min_order_qty, lead_time_days, category, notes). Chama `supplier-import-validate`.
3. **Preview** — Tabela com 20 rows, badges matched/unmatched/error, preço calculado. `MatchResolverRow` inline para unmatched (pesquisar produto ou quick create).
4. **Confirm** — Resumo stats + botão commit. Chama `supplier-import-commit`. Progress bar.

### 3.3 Sub-componentes
- `PricingRulesPanel` — UI para pricing_mode options (desconto, margem, base field, pack toggle)
- `ImportPreviewTable` — Tabela com erros por linha, match badges
- `MatchResolverRow` — Inline: autocomplete produto existente ou botão "Criar produto"
- `PriceImportHistory` — Lista de importações anteriores com stats

### 3.4 Hook: `useSupplierPriceImport`
- Upload file to storage
- Invoke parse/validate/commit edge functions
- Query import rows for preview
- Update match (product_id) on individual rows

---

## 4. Routing & Navigation

- Adicionar rota em `App.tsx`: `/dashboard/procurement/price-import`
- Adicionar entrada no `nav.v1.ts` no grupo Compras: "Importar Preços"
- i18n keys em PT/EN/ES/FR

---

## 5. Ficheiros a criar/modificar

| Acção | Ficheiro |
|-------|---------|
| Criar | Migração SQL (2 tabelas + extensão supplier_products + bucket + RLS) |
| Criar | `supabase/functions/supplier-import-parse/index.ts` |
| Criar | `supabase/functions/supplier-import-validate/index.ts` |
| Criar | `supabase/functions/supplier-import-commit/index.ts` |
| Criar | `src/pages/procurement/SupplierPriceImportPage.tsx` |
| Criar | `src/components/procurement/price-import/SupplierPriceImportWizard.tsx` |
| Criar | `src/components/procurement/price-import/PricingRulesPanel.tsx` |
| Criar | `src/components/procurement/price-import/ImportPreviewTable.tsx` |
| Criar | `src/components/procurement/price-import/MatchResolverRow.tsx` |
| Criar | `src/components/procurement/price-import/PriceImportHistory.tsx` |
| Criar | `src/hooks/useSupplierPriceImport.ts` |
| Modificar | `supabase/config.toml` — registar 3 EFs |
| Modificar | `src/App.tsx` — rota |
| Modificar | `src/config/nav.v1.ts` — nav entry |
| Modificar | i18n (pt/en/es/fr procurement namespace) |

---

## Notas técnicas

- XLSX parsing: no edge function usar `npm:xlsx` (já no deno.json como dep do frontend); no frontend fazer parse local e enviar JSON como alternativa para ficheiros grandes
- Matching fuzzy por nome **não** é automático — apenas suggestion. Automático apenas por barcode e supplier_sku exact match
- Cada edge function tem CORS headers + `verify_jwt = false`
- Batch de 250 no commit para evitar timeouts de 60s

