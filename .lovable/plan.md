

# Product Import & Supplier Link Engine 2.0 — Plano P0

## Diagnóstico

O sistema actual tem 3 edge functions (`supplier-import-parse`, `supplier-import-validate`, `supplier-import-commit`), um wizard de 4 steps, e um modal alternativo (`CatalogBulkPriceModal`) com lógica independente. Problemas confirmados:

1. **CSV parsing frágil** — `split(delimiter)` sem suporte a aspas, campos multi-linha ou encoding
2. **Ficheiro reparseado** na fase validate (download + parse duplicado)
3. **Commit linha a linha** — SELECT + UPDATE/INSERT por row no commit
4. **Matching rígido** — apenas barcode exato, supplier_sku exato, nome exato
5. **Dois pipelines** — `CatalogBulkPriceModal` com lógica própria de import
6. **Sem profiles** — o utilizador remapeia colunas a cada import do mesmo fornecedor
7. **Sem staging persistente robusta** — `supplier_price_import_rows` não tem campos de normalização, confiança ou hash

## Decisões de Arquitetura

1. **Evoluir tabelas existentes** em vez de criar tabelas paralelas — adicionar campos a `supplier_price_imports`, `supplier_price_import_rows` e `supplier_products`
2. **Nova tabela `supplier_import_profiles`** para templates reutilizáveis por fornecedor
3. **Nova tabela `supplier_product_aliases`** para matching melhorado
4. **Staging na validate** — o parse grava rows em staging, o validate trabalha sobre staging (sem reparsear)
5. **Commit batch** via upsert SQL em vez de loops individuais
6. **`CatalogBulkPriceModal`** passa a abrir o wizard oficial
7. **Edge functions v2** substituem as v1 progressivamente

## Faseamento (4 Batches)

### Batch 1 — Schema + Migration

**Novas tabelas:**
- `supplier_import_profiles` (workspace_id, supplier_id, name, is_default, mapping_json, pricing_mode, delimiter_hint, encoding_hint, pricing options, matching_strategy_json, normalization_rules_json)
- `supplier_product_aliases` (workspace_id, supplier_id, product_id, alias_type [sku/barcode/name], alias_value_normalized, confidence_source, is_active)

**Evolução de `supplier_price_imports`:**
- Adicionar: `profile_id`, `file_checksum`, `file_size_bytes`, `current_step`, `progress_percent`, `total_rows`, `parsed_rows`, `matched_rows`, `unmatched_rows`, `error_rows`, `duplicate_rows`, `started_at`, `finished_at`

**Evolução de `supplier_price_import_rows`:**
- Adicionar: `parse_status`, `parse_error_text`, `validation_status`, `validation_error_text`, `match_method`, `match_confidence`, `matched_supplier_product_id`, `duplicate_key`, `pricing_status`, `computed_discount_percent`, `commit_status`, `commit_error_text`, `row_hash`

**Evolução de `supplier_products`:**
- Adicionar: `supplier_sku_normalized`, `barcode_normalized`, `supplier_product_name_raw`, `supplier_product_name_normalized`, `match_method`, `match_confidence`, `match_locked`, `link_status`, `last_import_job_id`, `last_seen_at`, `last_price_change_at`, `previous_unit_price`, `previous_rrp_price`

**RLS:** Todas as novas tabelas com políticas por workspace_id. Profiles e aliases: SELECT/INSERT/UPDATE/DELETE para membros do workspace.

### Batch 2 — Edge Functions v2

**`supplier-import-parse-v2`:**
- CSV: usar parsing robusto com suporte a aspas, delimitadores dentro de campos, multi-line
- XLSX: reutilizar lógica ExcelJS actual
- Gravar rows directamente em `supplier_price_import_rows` como staging (raw_json + parse_status)
- Aplicar normalização (trim, lowercase, remoção acentos, barcode sem notação científica)
- Actualizar contadores no import record
- Não reparsear na fase seguinte

**`supplier-import-validate-v2`:**
- Trabalhar sobre staging rows já gravadas (sem download do ficheiro)
- Matching engine melhorado: supplier_sku → barcode → alias → nome exato → fuzzy (Levenshtein simplificado)
- Atribuir match_method e match_confidence a cada row
- Pricing engine (reutilizar lógica `computePrices` existente)
- Detecção de duplicados (mesmo supplier_sku + supplier_id)
- Detecção de alterações de preço suspeitas (comparação com `supplier_products.unit_price`)
- Actualizar stats no import record

**`supplier-import-commit-v2`:**
- Batch upsert via SQL (`ON CONFLICT (workspace_id, supplier_id, product_id)`)
- Gravar previous_unit_price antes de actualizar
- Criar aliases automaticamente para links confirmados
- Actualizar `last_seen_at`, `last_price_change_at`
- Registar stats finais

### Batch 3 — Frontend: Wizard v2 + Hooks

**Novos hooks:**
- `useSupplierImportProfiles` — CRUD de profiles por fornecedor
- `useSupplierImportV2` — orquestra o pipeline completo (upload → parse → validate → commit)

**Wizard reconstruído (8 steps):**
1. **Supplier + Profile** — selector de fornecedor + profiles guardados + criar novo
2. **Upload** — upload com checksum, detecção de formato, validação tamanho
3. **Auto Mapping** — mapping sugerido a partir do profile; edição manual; guardar no profile
4. **Quality Gate** — stats de parse (total, valid, errors, warnings)
5. **Match Review** — tabs: Auto-matched | Needs Review | Unmatched | Duplicates | Errors
6. **Commit Preview** — impacto: links actualizados, novos, rejeitados, preços alterados
7. **Commit** — progress real via polling do job
8. **Summary** — created/updated/unchanged/failed + export de erros

**Exception Workbench (tab dentro do step 5):**
- Rows sem match com sugestões de produtos
- Ação: associar manualmente, criar alias, ignorar
- Rows com preço suspeito: mostrar delta e permitir aceitar/rejeitar

**`CatalogBulkPriceModal`** — simplificado para apenas abrir navegação para `/dashboard/procurement/price-import` ou invocar o wizard inline

### Batch 4 — Profile Editor + History + Métricas

**SupplierImportProfileEditor:**
- Criar/editar profiles com mapping, pricing rules, matching strategy
- Marcar profile como default para o fornecedor

**PriceImportHistory melhorado:**
- Stats detalhados por import (matched, unmatched, errors, duration)
- Re-import a partir de histórico (pré-preenche supplier + profile)
- Export de rows com erro para CSV/Excel

**Métricas básicas:**
- Match rate por fornecedor
- Import duration
- Error rate

## Ficheiros Alterados/Criados

| Ficheiro | Tipo |
|---|---|
| `supabase/migrations/xxx_import_engine_v2.sql` | Migration |
| `supabase/functions/supplier-import-parse-v2/index.ts` | Edge Function |
| `supabase/functions/supplier-import-validate-v2/index.ts` | Edge Function |
| `supabase/functions/supplier-import-commit-v2/index.ts` | Edge Function |
| `src/hooks/useSupplierImportProfiles.ts` | Hook |
| `src/hooks/useSupplierImportV2.ts` | Hook |
| `src/components/procurement/price-import/SupplierPriceImportWizard.tsx` | Reconstruído |
| `src/components/procurement/price-import/ImportProfileSelector.tsx` | Novo |
| `src/components/procurement/price-import/ImportColumnMapper.tsx` | Novo |
| `src/components/procurement/price-import/ImportQualityGate.tsx` | Novo |
| `src/components/procurement/price-import/ImportMatchReview.tsx` | Novo |
| `src/components/procurement/price-import/ImportCommitPreview.tsx` | Novo |
| `src/components/procurement/price-import/ImportJobProgress.tsx` | Novo |
| `src/components/procurement/price-import/ImportSummary.tsx` | Novo |
| `src/components/procurement/price-import/ExceptionWorkbench.tsx` | Novo |
| `src/components/procurement/CatalogBulkPriceModal.tsx` | Simplificado |
| `src/components/procurement/price-import/PriceImportHistory.tsx` | Melhorado |
| `src/components/procurement/price-import/ImportPreviewTable.tsx` | Melhorado |

## Critérios de Aceitação

- Um único pipeline oficial de importação
- `CatalogBulkPriceModal` não tem lógica própria de parse/import
- CSV com aspas e delimitadores internos é parseado correctamente
- Ficheiro não é reparseado entre fases (staging persistente)
- Matching por supplier_sku existente, barcode, alias e nome exato funciona
- Commit em batch (não linha a linha)
- Profile reutilizável: segundo import do mesmo fornecedor aplica mapping automaticamente
- Exception workbench mostra apenas rows problemáticas
- Preços anteriores são preservados antes de update
- Stats finais correctas (created, updated, errors)

