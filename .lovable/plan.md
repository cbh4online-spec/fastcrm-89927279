

# B2B-Catalog — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Tier CRUD | `useClientPricing.ts` → `usePriceTiers` | None | Toast only |
| Product Tier Prices | `useClientPricing.ts` → `useProductTierPrices` | None | Toast only |
| Contact Pricing | `useContactPricing.ts` | None | None |
| Client User Pricing | `useContactPricing.ts` → `useClientUserPricing` | None | None |
| Store Tier Pricing | `useStoreTierPricing.ts` | None | None |
| B2B Portal Products | `useClientProducts.ts` | None | None |
| Price Computation | `pricing-tier.ts` → `getEffectivePrice` | None | None |
| AI Pricing Optimizer | `usePricingOptimizer.ts` + edge fn | None | Unknown |
| Smoke Tests | `system-run-smoke-tests` | — | No b2b-catalog checks |

Zero kernel events. Zero logging across all pricing hooks and computation paths.

## Implementation Plan

### A) Kernel Events — Tier & Price CRUD (`useClientPricing.ts`)

Source: `b2b-catalog`, entity_kind: `client_price_tier` / `product_tier_price`.

1. `createTier.onSuccess` → emit `B2B.TIER_CREATED` (payload: `name`, `code`, `discount_percentage`)
2. `updateTier.onSuccess` → emit `B2B.TIER_UPDATED` (payload: `id`)
3. `deleteTier.onSuccess` → emit `B2B.TIER_DELETED` (payload: `id`)
4. `setTierPrice.onSuccess` → emit `B2B.PRICE_UPDATED` (entity_kind: `product_tier_price`, payload: `product_id`, `tier_id`, `price_net`)
5. `removeTierPrice.onSuccess` → emit `B2B.PRICE_REMOVED` (payload: `id`)

### B) Logging — Price Computation (`pricing-tier.ts` → `getEffectivePrice`)

Add `console.log('[B2B-CATALOG] Price computed: base=${basePrice}, effective=${result}, source=${source}')` where source is `tier_price`, `tier_discount`, or `base`.

### C) Logging — Hooks (prefix: `[B2B-CATALOG]`)

**`useClientPricing.ts`:**
- Create/update/delete tier success + all errors
- Set/remove tier price success + errors

**`useContactPricing.ts`:**
- `useContactPricing` query error → `console.warn('[B2B-CATALOG] CONTACT_PRICING_FAILED')`
- `useClientUserPricing` query error → `console.warn('[B2B-CATALOG] CLIENT_USER_PRICING_FAILED')`

**`useStoreTierPricing.ts`:**
- Query error → `console.warn('[B2B-CATALOG] STORE_TIER_PRICING_FAILED')`

**`useClientProducts.ts`:**
- Products query error → `console.warn('[B2B-CATALOG] CLIENT_PRODUCTS_FAILED')`

**`usePricingOptimizer.ts`:**
- Each mutation error → `console.warn('[B2B-CATALOG] <MODE>_FAILED')`

### D) Smoke Tests

Add to `system-run-smoke-tests`:
- `client_price_tiers` (module: `b2b-catalog`)
- `product_tier_prices` (module: `b2b-catalog`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useClientPricing.ts` | Import `emitKernelEvent`; emit 5 events; add `[B2B-CATALOG]` logging |
| `src/types/pricing-tier.ts` | Add `console.log` to `getEffectivePrice` for price computation observability |
| `src/hooks/useContactPricing.ts` | Add `[B2B-CATALOG]` error logging |
| `src/hooks/useStoreTierPricing.ts` | Add `[B2B-CATALOG]` error logging |
| `src/hooks/client-portal/useClientProducts.ts` | Add `[B2B-CATALOG]` error logging |
| `src/hooks/usePricingOptimizer.ts` | Add `[B2B-CATALOG]` error logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add 2 b2b-catalog table checks |

