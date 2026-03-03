

# Add Suppliers to RFQ After Creation

## Plan

### 1. New hook: `useAddRFQSupplier` in `src/hooks/useRFQ.ts`
- Insert into `rfq_suppliers` table with `workspace_id`, `rfq_id`, `supplier_id`, `status: "invited"`
- Invalidate `rfq-suppliers` query on success
- Filter out already-added suppliers in the UI

### 2. Update `RFQDetailPage.tsx`
- Import `useSuppliers` from `useProcurement` to get all workspace suppliers
- Add "Adicionar Fornecedor" button in the Suppliers card header
- Show a Dialog with a Select dropdown of available suppliers (excluding already-added ones)
- On confirm, call the new mutation
- Allow adding suppliers when RFQ is in `draft` or `sent` status

### Files
- `src/hooks/useRFQ.ts` — add `useAddRFQSupplier` mutation
- `src/pages/procurement/RFQDetailPage.tsx` — add supplier dialog + button

