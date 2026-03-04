

# Fix: Public Listing Detail Route Missing

## Problem
The URL `/c2c/simples-e-divertido/f8744985-c7f4-4f09-b8bd-5dd8b0c9c8f1` returns 404 because there's no route for `/c2c/:workspaceSlug/:listingId`. Only `/c2c/:workspaceSlug` (marketplace homepage) exists.

## Solution
Create a public listing detail page and add the route.

### 1. New page: `src/pages/c2c/C2CPublicListingDetail.tsx`
- Uses `useParams` to get `workspaceSlug` and `id`
- Resolves workspace from slug (same pattern as `C2CPublicMarketplace`)
- Fetches listing by ID directly from `c2c_listings` (public query, no auth required)
- Renders listing detail: photos gallery, title, price, description, condition, location, seller info
- "Contactar vendedor" button links to login or opens chat
- "Voltar ao Marketplace" links to `/c2c/:workspaceSlug`
- SEO meta tags via `react-helmet-async` (OG title, description, image)
- Premium dark styling matching existing public pages

### 2. Route addition in `App.tsx`
Add before the existing `/c2c/:workspaceSlug` route (more specific first):
```
<Route path="/c2c/:workspaceSlug/:id" element={<C2CPublicListingDetail />} />
```

### Files
| File | Action |
|------|--------|
| `src/pages/c2c/C2CPublicListingDetail.tsx` | Create |
| `src/App.tsx` | Add route + import |

