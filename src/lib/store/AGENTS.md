# Store rules

- The storefront catalogue builds a lightweight full-catalogue index in `useInfiniteStoreProducts` (real totals, brand facets, "Recomendados" via `src/lib/store/recommendedRank.ts`) and loads details per page, so counts and order never depend on the loaded page.
- Store cart stock uses `src/lib/store/cartStock.ts` (track_stock, quantity minus stock_reserved, summed lines), mirrored in `_shared/store-pricing.ts`; cart/checkout block while checking or on error, so no order exceeds sellable stock.
- Store shipping cost comes only from `_shared/cttRates.ts`, recomputed server-side in create-store-checkout; never show free-shipping claims the checkout does not apply.
- Storefront categories come from the `get_public_store_category_tree` RPC + `src/lib/store/categoryTree.ts` (menu = visible roots; filters/counts include all descendants once), and the product category trigger never auto-creates categories for workspaces with a closed taxonomy (currently hard-listed in `resolve_store_category_id`), so curated hierarchies are preserved and costs stay private.
