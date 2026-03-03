

# Fix: Show RFQ Items on Detail Page

## Problem
The RFQ detail page is missing an **Items section**. The page only shows "Fornecedores Convidados" and "Comparação de Cotações", but never displays the actual RFQ items (products and quantities). This makes the page appear empty when there are no suppliers or quotes yet.

## Plan

In `src/pages/procurement/RFQDetailPage.tsx`, add a new Card between the Suppliers card and the Comparison card that lists the RFQ items in a simple table:

- **Columns**: Produto, SKU, Quantidade
- **Data source**: `items` array from `useRFQDetail` (already fetched)
- Show product name from `item.products?.name` and SKU from `item.products?.sku`

### File
- `src/pages/procurement/RFQDetailPage.tsx` -- add Items card after the Suppliers card (after line 141)

