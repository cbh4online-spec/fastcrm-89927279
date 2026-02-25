

# Fix: /marketplace 404 — Missing Route Redirect

## Problem

The Marketplace page is registered at `/dashboard/marketplace` in `App.tsx` (line 444), but something is linking to `/marketplace` (without the `/dashboard` prefix), causing a 404.

## Fix

Add a redirect route from `/marketplace` to `/dashboard/marketplace` in `App.tsx`, alongside the other public-to-dashboard redirects already in the file.

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Add `<Route path="/marketplace" element={<Navigate to="/dashboard/marketplace" replace />} />` in the public routes section |

