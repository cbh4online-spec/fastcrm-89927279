
# Fix Supplier Web Search (Firecrawl)

## Problem

The `supplier-web-search` edge function is failing. The Firecrawl connector is linked and active, but the function produces no logs — suggesting it crashes on startup or during auth validation. The likely cause is `supabase.auth.getClaims()` which may not be available in the Deno Supabase client version.

## Fix

### 1. Edge Function: `supabase/functions/supplier-web-search/index.ts`

- Replace `getClaims()` auth with `supabase.auth.getUser(token)` — the standard and reliable method
- Improve error handling to return 200 with structured error payloads (resilient pattern) so the frontend gets useful error messages instead of generic catch-all
- Keep the Firecrawl search + AI extraction logic unchanged

### 2. Frontend: `src/components/procurement/SupplierSearchDialog.tsx`

- Improve error handling to show specific error messages from the edge function response (e.g., "AI credits exhausted", "Rate limit") instead of the generic Firecrawl message
- Check `data.error` in addition to the `error` parameter from `invoke`

## Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/supplier-web-search/index.ts` | Replace `getClaims` with `getUser`, return 200 with error payload for non-fatal errors |
| `src/components/procurement/SupplierSearchDialog.tsx` | Show specific error messages from response |
