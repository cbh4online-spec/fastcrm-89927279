

# Fix: "Contactar" button not working

## Problem
The "Contactar" button in the seller card tries to scroll to `#contact-seller`, but that element only renders when the viewer is logged in AND not the listing owner. If the user is viewing their own listing, nothing happens. Even for other users, scrolling to a textarea is not the best UX — it should navigate directly to the messaging system with context.

## Solution
Replace the scroll-to-element behavior with proper navigation to the C2C messages page, passing the seller and listing context. This mirrors the Vinted pattern where "Contactar" opens a conversation thread.

### Changes to `src/pages/c2c/C2CListingDetail.tsx`

1. **"Contactar" button in seller card (line 355-360)**: Navigate to `/dashboard/c2c/messages` with query params `?to=${listing.seller_id}&listing=${listing.id}` instead of scrolling
2. **Keep the inline message textarea** as a secondary contact option for non-owners (no change needed there)
3. If user is the owner, hide the "Contactar" button (they can't message themselves)

### Files
| File | Action |
|------|--------|
| `src/pages/c2c/C2CListingDetail.tsx` | Fix Contactar button to navigate to messages page with seller/listing context |

