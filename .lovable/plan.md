

# Fix `/dashboard/b2b/approvals` — 404

## Problem

The route manifest (`routeManifest.ts`) defines `b2b-approvals` pointing to `/dashboard/b2b/approvals`, but the actual React route in `StoreClientRoutes.tsx` only registers `/dashboard/order-approvals`. There's no `<Route>` for the new path, causing a 404.

## Fix

Add a redirect or duplicate route in `StoreClientRoutes.tsx` so `/dashboard/b2b/approvals` resolves to the `OrderApprovalsPage` component — same as `/dashboard/order-approvals`.

**File**: `src/routes/StoreClientRoutes.tsx`
- Add: `<Route path="/dashboard/b2b/approvals" element={<OrderApprovalsPage />} />`

This is a one-line fix. The existing `/dashboard/order-approvals` route stays for backward compatibility.

