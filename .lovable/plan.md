

## Problem

The blank screen error is the same `useAuth must be used within an AuthProvider` issue — this time from `C2CSponsorPortal` which uses `useAuth` (line 5 of that file) but its route at `/c2c/:workspaceSlug/sponsor` (App.tsx line 635) is **not** wrapped in `AuthProvider`.

## Fix

Wrap the `C2CSponsorPortal` route in `AuthProvider`, same pattern as the previous fix for `C2CSellerRegistration`:

**File: `src/App.tsx`, line 635**

Change:
```tsx
<Route path="/c2c/:workspaceSlug/sponsor" element={<C2CSponsorPortal />} />
```
To:
```tsx
<Route path="/c2c/:workspaceSlug/sponsor" element={<AuthProvider><C2CSponsorPortal /></AuthProvider>} />
```

Single line change, same fix pattern as the earlier `C2CSellerRegistration` fix.

