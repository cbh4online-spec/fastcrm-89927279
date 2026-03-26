

# Step 2 — Cleanup Legacy Files

## Current State

- `src/App.tsx` already uses the modular architecture (imports `StoreRoutes`, `ClientPortalRoutes`, `CRMRoutesV2`)
- `src/App.v2.tsx` exists as a **duplicate** — identical content to `App.tsx`, no longer needed
- There is **no old `CRMRoutes.tsx`** — only `CRMRoutes.v2.tsx` which is actively used
- `src/routes/StoreClientRoutes.tsx` still exists and is still imported by `CRMRoutes.v2.tsx` for `StoreAdminRoutes` and `B2BAdminRoutes` — this must stay

## Action

**Delete 1 file:**
- `src/App.v2.tsx` — redundant duplicate of `App.tsx`

**No other files to delete.** `StoreClientRoutes.tsx` is still actively imported and must remain.

## Technical Details

- No imports reference `App.v2.tsx` anywhere in the codebase
- Content of `App.v2.tsx` is identical to `App.tsx` (same 135 lines, same BUILD_VERSION, same imports)
- Zero risk of breakage

