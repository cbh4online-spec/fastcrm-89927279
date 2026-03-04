

# Public Offer on C2C Listing (Guest/Visitor)

## Problem
Visitors on the public listing page (`/c2c/:workspaceSlug/:id`) cannot make offers because the current `c2c_offers` table requires authentication (`buyer_id = auth.uid()`). Visitors need to leave name + email/phone to submit an offer.

## Solution
Create a dedicated `c2c_public_offers` table (anonymous-friendly) and a new `C2CPublicOfferDialog` component for the public listing page, following the same pattern as `StoreOfferDialog`.

### 1. Database migration — `c2c_public_offers` table
```sql
CREATE TABLE public.c2c_public_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  listing_id UUID NOT NULL REFERENCES public.c2c_listings(id),
  seller_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  offered_price NUMERIC NOT NULL,
  original_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  message TEXT,
  status TEXT DEFAULT 'pending',
  admin_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: allow anonymous INSERT, seller SELECT/UPDATE (authenticated)
- Notify seller via `c2c_notifications` insert

### 2. New component: `src/components/c2c/C2CPublicOfferDialog.tsx`
- Dialog with fields: Name, Email, Phone (optional), Offer price, Message (optional)
- Minimum offer: 50% of listed price
- Dark theme styling matching the public listing page (zinc/amber palette)
- Validates email format client-side
- Inserts into `c2c_public_offers` + creates `c2c_notifications` entry for seller

### 3. New hook: `useC2CPublicOffers` (in existing `useC2COffers.ts` or new file)
- `useCreatePublicOffer` mutation — inserts into `c2c_public_offers`
- `usePublicOffersForListing` query — for seller dashboard (future)

### 4. Update `C2CPublicListingDetail.tsx`
- Add "Fazer Oferta" button next to "Contactar vendedor" in the sidebar
- Wire up `C2CPublicOfferDialog` with listing data

### Files
| File | Action |
|------|--------|
| Migration SQL | Create `c2c_public_offers` table + RLS |
| `src/components/c2c/C2CPublicOfferDialog.tsx` | Create — offer dialog for visitors |
| `src/hooks/useC2CPublicOffers.ts` | Create — mutation + query hooks |
| `src/pages/c2c/C2CPublicListingDetail.tsx` | Add offer button + dialog |

