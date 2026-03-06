

# Store-Marketplace — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Listing CRUD | `useC2CListings.ts` | None | Toast only |
| Messages (send/offer/respond) | `useC2CMessages.ts` | None | Toast only |
| Realtime subscription | `useC2CMessages.ts` → `useC2CThread` | None | None |
| Offers CRUD | `useC2COffers.ts` | None | Toast only |
| Reviews | `useC2CReviews.ts` | None | Toast only |
| Sellers CRUD | `useC2CSellers.ts` | None | Toast only |
| Affiliates | `useC2CAffiliates.ts` | None | Toast only |
| Referrals | `useC2CReferrals.ts` | None | Toast only |
| Payouts | `useC2CPayouts.ts` | None | Toast only |
| Checkout | `create-c2c-checkout` edge fn | None | `[C2C-CHECKOUT]` (good) |
| Webhook | `c2c-webhook` edge fn | None | `[C2C-WEBHOOK]` (good) |
| Track Click | `marketplace-track-click` edge fn | None | `[TRACK-CLICK]` |
| Attribute Sale | `marketplace-attribute-sale` edge fn | None | `[ATTRIBUTE-SALE]` |
| Boost Checkout | `create-c2c-boost-checkout` edge fn | None | `[C2C-BOOST-CHECKOUT]` |
| AI Listing Assistant | `ai-c2c-listing-assistant` edge fn | None | None |
| Payout Execute | `marketplace-payout-execute` edge fn | None | `[PAYOUT-EXECUTE]` |
| Process Payouts | `marketplace-process-payouts` edge fn | None | Unknown |
| Smoke Tests | `system-run-smoke-tests` | — | No marketplace checks |

Zero kernel events. Edge functions have partial logging with inconsistent prefixes.

## Implementation Plan

### A) Kernel Events — UI Hooks (source: `store-marketplace`)

**`useC2CListings.ts`:**
1. `useCreateC2CListing.onSuccess` → emit `LISTING.CREATED` (entity_kind: `c2c_listing`, payload: `title`, `price`, `condition`)

**`useC2CMessages.ts`:**
2. `useSendC2CMessage.onSuccess` → emit `MARKETPLACE.MESSAGE_SENT` (entity_kind: `c2c_message`, payload: `listing_id`, `message_type`)
3. `useSendC2COfferMessage.onSuccess` → emit `MARKETPLACE.OFFER_SENT` (entity_kind: `c2c_offer`, payload: `listing_id`, `offer_price`)
4. `useRespondToOfferInChat.onSuccess` → emit `MARKETPLACE.OFFER_RESPONDED` (payload: `action`, `listing_id`)
5. `useUpdateListingStatusInChat.onSuccess` → emit `LISTING.STATUS_CHANGED` (payload: `new_status`, `listing_id`)

**`useC2CReviews.ts`:**
6. `useSubmitReview.onSuccess` → emit `RATING.SUBMITTED` (entity_kind: `c2c_review`, payload: `listing_id`, `seller_id`, `rating`)

### B) Kernel Events — Edge Functions (via internal fetch to `kernel-ingest-event`)

**`c2c-webhook/index.ts`:**
7. After `c2c_purchase` completed → emit `MARKETPLACE.SALE_COMPLETED` (payload: `listing_id`, `sale_amount`)

**`marketplace-attribute-sale/index.ts`:**
8. After affiliate attribution → emit `MARKETPLACE.AFFILIATE_ATTRIBUTED` (payload: `listing_id`, `affiliate_id`, `commission`)

### C) Logging — UI Hooks (prefix: `[MARKETPLACE]`)

**`useC2CListings.ts`:**
- Create success/error, Update error, Report error

**`useC2CMessages.ts`:**
- Send success/error, Offer sent/error, Respond error, Status update error
- Realtime subscribe/unsubscribe logs

**`useC2COffers.ts`:**
- Create success/error, Respond success/error

**`useC2CReviews.ts`:**
- Submit success/error

**`useC2CSellers.ts`:**
- Register success/error, Status update error

**`useC2CAffiliates.ts`:**
- Join success/error, Link create error

**`useC2CReferrals.ts`:**
- Create success/error

**`useC2CPayouts.ts`:**
- Execute success/error, Process success/error

### D) Logging — Edge Functions (align all to `[MARKETPLACE]`)

**`ai-c2c-listing-assistant/index.ts`:** Add `[MARKETPLACE]` logging for AI calls and errors (currently has none).

**`marketplace-track-click`:** Align `[TRACK-CLICK]` → `[MARKETPLACE]`

**`marketplace-attribute-sale`:** Align `[ATTRIBUTE-SALE]` → `[MARKETPLACE]`

**`marketplace-process-payouts`:** Align to `[MARKETPLACE]`

**`marketplace-payout-execute`:** Align `[PAYOUT-EXECUTE]` → `[MARKETPLACE]`

Keep `[C2C-CHECKOUT]`, `[C2C-WEBHOOK]`, `[C2C-BOOST-CHECKOUT]` as-is (already consistent within their domain).

### E) Smoke Tests

Add to `system-run-smoke-tests`:
- `c2c_listings` (module: `store-marketplace`)
- `c2c_messages` (module: `store-marketplace`)
- `c2c_reviews` (module: `store-marketplace`)
- `c2c_offers` (module: `store-marketplace`)
- `c2c_sellers` (module: `store-marketplace`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useC2CListings.ts` | Import `emitKernelEvent`; emit `LISTING.CREATED`; add `[MARKETPLACE]` logging |
| `src/hooks/useC2CMessages.ts` | Import `emitKernelEvent`; emit `MARKETPLACE.MESSAGE_SENT`, `MARKETPLACE.OFFER_SENT`, `MARKETPLACE.OFFER_RESPONDED`, `LISTING.STATUS_CHANGED`; add `[MARKETPLACE]` logging + realtime logs |
| `src/hooks/useC2CReviews.ts` | Import `emitKernelEvent`; emit `RATING.SUBMITTED`; add `[MARKETPLACE]` logging |
| `src/hooks/useC2COffers.ts` | Add `[MARKETPLACE]` logging |
| `src/hooks/useC2CSellers.ts` | Add `[MARKETPLACE]` logging |
| `src/hooks/useC2CAffiliates.ts` | Add `[MARKETPLACE]` logging |
| `src/hooks/useC2CReferrals.ts` | Add `[MARKETPLACE]` logging |
| `src/hooks/useC2CPayouts.ts` | Add `[MARKETPLACE]` logging |
| `supabase/functions/c2c-webhook/index.ts` | Emit `MARKETPLACE.SALE_COMPLETED` via kernel-ingest-event |
| `supabase/functions/marketplace-attribute-sale/index.ts` | Emit `MARKETPLACE.AFFILIATE_ATTRIBUTED`; align prefix to `[MARKETPLACE]` |
| `supabase/functions/marketplace-track-click/index.ts` | Align prefix to `[MARKETPLACE]` |
| `supabase/functions/marketplace-payout-execute/index.ts` | Align prefix to `[MARKETPLACE]` |
| `supabase/functions/marketplace-process-payouts/index.ts` | Align prefix to `[MARKETPLACE]` |
| `supabase/functions/ai-c2c-listing-assistant/index.ts` | Add `[MARKETPLACE]` logging for AI calls |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add 5 store-marketplace table checks |

