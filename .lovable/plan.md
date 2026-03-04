

## Analysis

The `C2CSponsorPortal` route fix is **already applied** at line 635 of `src/App.tsx`:

```tsx
<Route path="/c2c/:workspaceSlug/sponsor" element={<AuthProvider><C2CSponsorPortal /></AuthProvider>} />
```

I checked all other public C2C routes (`C2CPublicMarketplace`, `C2CSellerInviteActivation`, `C2CPublicSellerProfile`, `SupplierPortalPage`) — none use `useAuth` or `useWorkspace`, so they are not the source.

The error at line 16670 (vs the previous 9129) with `has_blank_screen: true` is most likely a **stale cached version** of the app before the fix was deployed. The error timestamp matches the same moment as the previous error.

## Recommendation

No code changes needed. Try a **hard refresh** (Ctrl+Shift+R / Cmd+Shift+R) in the preview to clear the cached bundle. The fix is already in place.

If the blank screen persists after a hard refresh, share the URL you're visiting so I can pinpoint which route is triggering it.

