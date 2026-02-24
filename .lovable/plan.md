

# Fix: TS2589 "Type instantiation is excessively deep" in ClientPlanCreatePage

## Problem

The build error is at `src/pages/client/ClientPlanCreatePage.tsx` line 39:

```typescript
const { data } = await supabase
  .from("products")
  .select("id, name, base_price, sku")
  .eq("workspace_id", clientUser.workspace_id)
  .eq("is_active", true)
  .order("name");
```

The `products` table has an extremely complex generated type (many columns, relationships) causing TypeScript's type inference to exceed its recursion limit when chaining multiple `.eq()` and `.order()` calls.

## Fix

Cast the supabase client to `any` for this specific query to break the type chain, since we're already casting the result with `as`:

```typescript
const { data } = await (supabase
  .from("products")
  .select("id, name, base_price, sku") as any)
  .eq("workspace_id", clientUser.workspace_id)
  .eq("is_active", true)
  .order("name");
```

This is a single-line fix. The result is already explicitly typed via the `as { id: string; name: string; base_price: number; sku: string | null }[]` cast on line 45, so type safety is maintained.

## Files to Edit

| File | Change |
|---|---|
| `src/pages/client/ClientPlanCreatePage.tsx` | Cast `.select()` to `any` to break infinite type recursion |

