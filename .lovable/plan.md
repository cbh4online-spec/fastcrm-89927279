

# Step 1 — Route Migration: Extract & Replace App.tsx

## Overview

Extract `StoreRoutes` and `ClientPortalRoutes` into their own files, create `CRMRoutes.v2.tsx` as the CRM composition module, build `App.v2.tsx` with the new clean imports, and finally replace `App.tsx`.

## Files to Create

### 1. `src/routes/StoreRoutes.tsx`
Move the `StoreRoutes` function + its lazy imports from `StoreClientRoutes.tsx` (lines 8-83) into a standalone file. Same code, same `StoreCartProvider` wrapper, own file.

### 2. `src/routes/ClientPortalRoutes.tsx`
Move the `ClientPortalRoutes` function + its lazy imports from `StoreClientRoutes.tsx` (lines 30-119) into a standalone file. Same `CartProvider` wrapper.

### 3. `src/routes/CRMRoutes.v2.tsx`
New file that exports `CRMRoutesV2` as a component (not a function returning fragments). It contains:
- The provider stack (`AuthProvider` → `WorkspaceProvider` → `ActivityProfileProvider` → `WorkspaceInstanceProvider` → `SubscriptionProvider`)
- A `<Routes>` block composing all existing sub-modules: `PublicSeoRoutes()`, `DashboardCoreRoutes()`, `SalesCRMRoutes()`, `AIRoutes()`, `ReportsRoutes()`, `AccountBriefRoutes()`, `RevenueFlightControlRoutes()`, `PerformanceRoutes()`, `ProcurementRoutes()`, `SecurityRoutes()`, `StudentJourneyRoutes()`, `CheckoutAdminRoutes()`, `C2CDashboardRoutes()`, `StoreAdminRoutes()`, `B2BAdminRoutes()`, `RevenueCommerceRoutes()`, `VerticalOpsRoutes()`
- The `ReportsKPIs` lazy import and `GDPRBanner`
- The `PageLoader` component

### 4. `src/App.v2.tsx`
Clean App shell importing from new standalone files:
```
import { StoreRoutes } from "@/routes/StoreRoutes"
import { ClientPortalRoutes } from "@/routes/ClientPortalRoutes"
import CRMRoutesV2 from "@/routes/CRMRoutes.v2"
```
Contains only:
- Top-level providers (`HelmetProvider`, `ThemeProvider`, `QueryClientProvider`, `TooltipProvider`, `BrowserRouter`, `GTMProvider`)
- Top-level public routes (funnel, bio, marketplace, checkout, supplier, fastclub, community)
- `<Route path="/store/*" element={<StoreRoutes />} />`
- `<Route path="/client/*" element={<ClientPortalRoutes />} />`
- `<Route path="/*" element={<CRMRoutesV2 />} />`
- C2C redirects, lazy page imports for public pages
- `Toaster`, `Sonner`, `MetaPixelLoader`

### 5. Replace `src/App.tsx`
Copy content of `App.v2.tsx` into `App.tsx`. Do NOT delete `App.v2.tsx` yet (per instructions).

## What stays unchanged
- `src/routes/StoreClientRoutes.tsx` — kept as-is (still exports `StoreAdminRoutes` and `B2BAdminRoutes` used by CRMRoutes.v2)
- All `src/routes/crm/*.tsx` files — untouched
- All other route modules — untouched
- All URLs remain identical

## Key decisions
- `StoreAdminRoutes` and `B2BAdminRoutes` stay in `StoreClientRoutes.tsx` since they're dashboard routes consumed inside `CRMRoutes.v2`, not standalone route trees
- `CRMRoutesV2` is a JSX component (not a function returning fragments) since it wraps its own `<Routes>` and providers — used as `<CRMRoutesV2 />` in the catch-all

