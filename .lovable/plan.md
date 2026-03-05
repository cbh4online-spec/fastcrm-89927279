

# Sales-Products — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Create | `useProducts.ts` → `useCreateProduct` | insert + SKU/name dup check | None | Toast only |
| Update | `useProducts.ts` → `useUpdateProduct` | update fields | None | Toast only |
| Archive | `useProducts.ts` → `useArchiveProduct` | toggle status | None | Toast only |
| Delete | `useProducts.ts` → `useDeleteProduct` | delete | None | Toast only |
| Quick Create | `product-quick-create/index.ts` | edge fn: full product creation | None | `console.error` (no prefix) |
| AI Improve | `product-ai-improve/index.ts` | edge fn: enrich metadata | None | `console.error` (no prefix) |
| Publish | `product-publish/index.ts` | edge fn: toggle publish status | None | `console.error` (no prefix) |
| Barcode | `useBarcodeLookup.ts` | lookup internal + external | None | None |
| Categories | `useProductCategories.ts` | CRUD categories | None | Toast only |
| Images | `useProductImages.ts` | CRUD images | None | Toast only |
| Components | `useProductComponents.ts` | CRUD bundle components | None | Toast only |
| Smoke Tests | `system-run-smoke-tests` | — | No product checks | — |

Zero kernel events. Zero structured logging.

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useProducts.ts`

Import `emitKernelEvent`. All events: `source_module: 'sales-products'`, `entity_kind: 'product'`.

**Create:**
1. `useCreateProduct.onSuccess` → `PRODUCT.CREATED` (payload: `has_sku`, `has_price`, `category`, `product_type`)
2. `onError` → `console.warn('[PRODUCTS] CREATE_FAILED', error.message)`

**Update:**
3. `useUpdateProduct.onSuccess` → `console.log('[PRODUCTS] Updated: ${id}')` ; if `base_price` changed → `PRODUCT.PRICE_UPDATED` (payload: `product_id`, `new_price`, `currency`)
4. `onError` → `console.warn('[PRODUCTS] UPDATE_FAILED')`

**Archive:**
5. `useArchiveProduct.onSuccess` → `console.log('[PRODUCTS] Archived/Reactivated: ${id}')`
6. `onError` → `console.warn('[PRODUCTS] ARCHIVE_FAILED')`

**Delete:**
7. `useDeleteProduct.onSuccess` → `console.log('[PRODUCTS] Deleted: ${id}')`
8. `onError` → `console.warn('[PRODUCTS] DELETE_FAILED')`

### B) Logging — Edge Functions

**`product-quick-create/index.ts`:**
1. Before insert → `console.log('[PRODUCTS] Quick-create: name=${name}, sku=${sku}, channel=${channel}')`
2. After insert → `console.log('[PRODUCTS] Quick-created: id=${productId}')`
3. Error → prefix existing `console.error` with `[PRODUCTS]`

**`product-ai-improve/index.ts`:**
4. Before AI call → `console.log('[PRODUCTS] AI-improve: product=${productId}')`
5. After success → `console.log('[PRODUCTS] AI-improved: fields=${fields.join(",")}')`
6. Error → prefix existing `console.error` with `[PRODUCTS]`

**`product-publish/index.ts`:**
7. Before update → `console.log('[PRODUCTS] Publish: product=${product_id}, status=${status}')`
8. After update → `console.log('[PRODUCTS] Published: product=${product_id}')`
9. Error → prefix existing `console.error` with `[PRODUCTS]`

### C) Logging — Supporting Hooks

**`useBarcodeLookup.ts`:**
1. Lookup fail → `console.warn('[PRODUCTS] BARCODE_LOOKUP_FAILED')`
2. External lookup fail → `console.warn('[PRODUCTS] BARCODE_EXTERNAL_FAILED')`

**`useProductCategories.ts`:**
3. Create/Update/Delete `onError` → `console.warn('[PRODUCTS] CATEGORY_*_FAILED')`

**`useProductImages.ts`:**
4. All `onError` → `console.warn('[PRODUCTS] IMAGE_*_FAILED')`

**`useProductComponents.ts`:**
5. All `onError` → `console.warn('[PRODUCTS] COMPONENT_*_FAILED')`

### D) Smoke Tests

Add to `system-run-smoke-tests`:
- `products` table check (module: `sales-products`)
- `product_categories` table check (module: `sales-products`)
- `product_images` table check (module: `sales-products`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useProducts.ts` | Import `emitKernelEvent`; emit `PRODUCT.CREATED`, `PRODUCT.PRICE_UPDATED`; add `[PRODUCTS]` logging |
| `supabase/functions/product-quick-create/index.ts` | Add `[PRODUCTS]` prefixed logging |
| `supabase/functions/product-ai-improve/index.ts` | Add `[PRODUCTS]` prefixed logging |
| `supabase/functions/product-publish/index.ts` | Add `[PRODUCTS]` prefixed logging |
| `src/hooks/useBarcodeLookup.ts` | Add `[PRODUCTS]` error logging |
| `src/hooks/useProductCategories.ts` | Add `[PRODUCTS]` error logging |
| `src/hooks/useProductImages.ts` | Add `[PRODUCTS]` error logging |
| `src/hooks/useProductComponents.ts` | Add `[PRODUCTS]` error logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `products`, `product_categories`, `product_images` checks |

