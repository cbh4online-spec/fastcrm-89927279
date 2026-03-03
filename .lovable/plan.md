

# Warning When Creating RFQ Without Recommended Suppliers

## Plan

In `src/pages/procurement/ProcurementNeedsBoardPage.tsx`, update `handleBulkCreateRFQ`:
- Before calling `createRFQ.mutate`, check how many of the selected needs lack a `recommended_supplier_id`
- If some lack suppliers, show a **confirmation dialog** (using AlertDialog) warning the user: "X dos Y itens selecionados não têm fornecedor recomendado. A RFQ será criada sem fornecedores pré-selecionados para esses itens. Continuar?"
- If all have suppliers, proceed directly

### Implementation
- Add state `showRFQWarning: boolean` and store the count of needs without suppliers
- Add an `AlertDialog` component to the page JSX
- On confirm, proceed with `createRFQ.mutate`; on cancel, close dialog

### File
- `src/pages/procurement/ProcurementNeedsBoardPage.tsx` — add warning dialog logic

