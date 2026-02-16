
# Fix: Dashboard 404 caused by catch-all `/:slug` route ordering

## Problem

The `/:slug` catch-all route (line 489 in `src/App.tsx`) is placed in the top-level `<Routes>` **before** the CRM wildcard route (`/*` on line 550). React Router matches routes in order, so `/dashboard` matches `/:slug` first, rendering `VerticalLandingPage` instead of the CRM routes. Since "dashboard" is not a valid vertical template slug, it shows 404.

This also affects `/fastclub`, `/login`, `/signup`, and potentially all CRM routes.

## Solution

Move the vertical landing page routes (both static and the `/:slug` catch-all) **inside** the `CRMRoutes` component, just before the `*` NotFound catch-all. This way:

1. All specific routes (`/dashboard`, `/login`, `/fastclub`, etc.) match first
2. Only truly unknown slugs fall through to `/:slug` for vertical template lookup
3. If the slug doesn't match a template either, `VerticalLandingPage` already handles showing NotFound

## Changes

### File: `src/App.tsx`

**Remove** from top-level Routes (lines 482-489):
```
<Route path="/clinicas" element={<VerticalLandingPage />} />
<Route path="/imobiliarias" element={<VerticalLandingPage />} />
<Route path="/formacao" element={<VerticalLandingPage />} />
<Route path="/condominios" element={<VerticalLandingPage />} />
<Route path="/agencias" element={<VerticalLandingPage />} />
<Route path="/empresas" element={<VerticalLandingPage />} />
<Route path="/:slug" element={<VerticalLandingPage />} />
```

**Add** inside `CRMRoutes`, just before the `<Route path="*" element={<NotFound />} />` line (before line 451):
```
<Route path="/clinicas" element={<VerticalLandingPage />} />
<Route path="/imobiliarias" element={<VerticalLandingPage />} />
<Route path="/formacao" element={<VerticalLandingPage />} />
<Route path="/condominios" element={<VerticalLandingPage />} />
<Route path="/agencias" element={<VerticalLandingPage />} />
<Route path="/empresas" element={<VerticalLandingPage />} />
<Route path="/:slug" element={<VerticalLandingPage />} />
```

This ensures all specific CRM routes have priority, and the vertical slug catch-all only captures truly unknown paths.
