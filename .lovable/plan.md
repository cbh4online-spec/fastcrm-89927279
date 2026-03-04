

# Fix: Wrong navigation path in C2CMyListings

## Problem
`C2CMyListings.tsx` navigates to `/dashboard/c2c/listing/${listing.id}` but the route is defined as `/dashboard/c2c/:id` (line 570 in App.tsx). The `/listing/` segment doesn't exist as a route.

## Solution
Change the navigation in `C2CMyListings.tsx` line 178 from:
```
/dashboard/c2c/listing/${listing.id}
```
to:
```
/dashboard/c2c/${listing.id}
```

### Files
| File | Action |
|------|--------|
| `src/pages/c2c/C2CMyListings.tsx` | Fix navigate path (line 178) |

