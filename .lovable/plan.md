

# Sales-Bundles — Kernel V2 Stabilization

## Scope

The "sales-bundles" module spans three layers:
1. **Product Components** (`useProductComponents.ts`) — bundle composition (already has `[PRODUCTS]` error logging from prior stabilization)
2. **Protocols/Kits** (`useProtocols.ts`) — protocol bundles with discount rules, cross-sells
3. **Marketplace Bundles** (`useMarketplaceBundles.ts`) — purchasable module bundles + checkout
4. **Bundle Checkout** (`bundle-checkout/index.ts`) — edge function (already has `[BUNDLE-CHECKOUT]` logging)

Product components already received `[PRODUCTS]` logging under the sales-products stabilization. This plan focuses on the **protocol/kit layer**, **marketplace bundles**, and **bundle pricing calculation** — the pieces with zero kernel events and zero structured logging.

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useProtocols.ts`

Import `emitKernelEvent`. Events: `source_module: 'sales-bundles'`, `entity_kind: 'protocol'`.

1. `createProtocol.onSuccess` → `BUNDLE.CREATED` (payload: `has_discount`, `discount_percentage`)
2. `createProtocol.onError` → `console.warn('[BUNDLES] PROTOCOL_CREATE_FAILED')`
3. `updateProtocol.onSuccess` → `BUNDLE.UPDATED` (payload: `protocol_id`); `console.log('[BUNDLES] Protocol updated')`
4. `updateProtocol.onError` → `console.warn('[BUNDLES] PROTOCOL_UPDATE_FAILED')`
5. `deleteProtocol.onSuccess` → `console.log('[BUNDLES] Protocol deleted')`
6. `deleteProtocol.onError` → `console.warn('[BUNDLES] PROTOCOL_DELETE_FAILED')`
7. `addProduct.onSuccess` → `console.log('[BUNDLES] Product added to protocol')`
8. `addProduct.onError` → `console.warn('[BUNDLES] PROTOCOL_ADD_PRODUCT_FAILED')`
9. `removeProduct.onSuccess` → `console.log('[BUNDLES] Product removed from protocol')`
10. `removeProduct.onError` → `console.warn('[BUNDLES] PROTOCOL_REMOVE_PRODUCT_FAILED')`
11. `addCrossSell.onError` → `console.warn('[BUNDLES] CROSS_SELL_ADD_FAILED')`
12. `removeCrossSell.onError` → `console.warn('[BUNDLES] CROSS_SELL_REMOVE_FAILED')`

### B) Logging — `src/hooks/useMarketplaceBundles.ts`

No kernel events (marketplace is platform-level, not workspace entity). Add `[BUNDLES]` prefix:

1. `usePurchaseBundle.onError` → `console.warn('[BUNDLES] PURCHASE_FAILED', error.message)` (replace bare `console.error`)

### C) Logging — `src/hooks/useProductComponents.ts` (calculateBundleTotals)

Add price rule evaluation logging to `calculateBundleTotals`:

1. Add `console.log('[BUNDLES] Price calc: components=${count}, mode=${bundlePriceMode}, total=${finalPrice}')` at end of calculation

### D) Logging — `supabase/functions/bundle-checkout/index.ts`

Already has `[BUNDLE-CHECKOUT]` prefix — consistent. No changes needed.

### E) Smoke Tests

Add to `system-run-smoke-tests`:
- `product_protocols` table check (module: `sales-bundles`)
- `protocol_products` table check (module: `sales-bundles`)
- `product_components` table check (module: `sales-bundles`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useProtocols.ts` | Import `emitKernelEvent`; emit `BUNDLE.CREATED`, `BUNDLE.UPDATED`; add `[BUNDLES]` logging to all mutations + cross-sells |
| `src/hooks/useMarketplaceBundles.ts` | Replace bare `console.error` with `[BUNDLES]` prefixed `console.warn` |
| `src/hooks/useProductComponents.ts` | Add price calc logging to `calculateBundleTotals` |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `product_protocols`, `protocol_products`, `product_components` checks under `sales-bundles` |

