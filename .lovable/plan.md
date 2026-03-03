

# Fix: RFQ Creation from Procurement Needs

## Root Cause
Two problems in the hook `useCreateRFQFromNeeds` (line 151):

1. **Empty supplier_ids**: The hook extracts `recommended_supplier_id` from selected needs, but if needs don't have a recommended supplier assigned, `supplierIds` is an empty array. The edge function then returns 400 because of the check `!supplier_ids?.length`.

2. **Edge function should handle empty suppliers gracefully**: When creating an RFQ from needs without pre-assigned suppliers, the function should still create the RFQ (suppliers can be added later).

## Plan

### 1. Update Edge Function `rfq-create-from-needs`
- Make `supplier_ids` optional -- allow creating an RFQ with 0 suppliers (they can be invited later)
- Change validation from `!supplier_ids?.length` to just `!workspace_id`
- Only insert into `rfq_suppliers` if `supplier_ids` has entries

### 2. Update Hook `useCreateRFQFromNeeds`
- Pass `supplier_ids` even if empty (let the edge function decide)
- Improve error extraction to surface the actual error message from the function response

### Files
- `supabase/functions/rfq-create-from-needs/index.ts` -- relax supplier_ids validation
- `src/hooks/useProcurementNeeds.ts` -- pass supplier_ids without blocking on empty

