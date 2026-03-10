

# Plan: Procurement Module — i18n, Flows & Import Improvements

## Scope Summary

This is a large set of changes across 3 areas. I'll break it into phases.

---

## Phase 1: Complete i18n (RFQsPage + RFQDetailPage + useProcurement toasts)

**Problem**: `RFQsPage.tsx` has ~30 hardcoded Portuguese strings (status labels, sort options, headers, empty states). `RFQDetailPage.tsx` has ~60+ hardcoded strings (buttons, labels, modals, sections). `useProcurement.ts` has ~20 hardcoded toast messages.

**Changes**:

### 1a. Add ~40 new translation keys to `procurement.json` (all 4 locales)
New keys needed (examples):
- `paymentTermsLabel`, `deliveryLocationLabel`, `incotermLabel`, `quoteValidityLabel`, `currencyLabel`
- `exportPDFButton`, `sendRFQButton`, `registerQuoteTableButton`, `importQuotePDFButton`, `individualQuoteButton`
- `awardButton`, `cancelButton`, `addButton`, `saveButton`
- `supplierCreated`, `supplierUpdated`, `supplierRemoved`, `requestCreated`, `requestApproved`, `requestRejected`, `orderCreated`, `statusUpdated`, `receiptRegistered`, `invoiceRegistered`, `invoiceStatusUpdated`, `catalogEntryCreated`, `catalogEntryUpdated`, `catalogEntryRemoved`, `ordersCreatedCount`, `errorCreatingSupplier`, `errorUpdatingSupplier`, etc.
- `proposalLabel`, `moq`

### 1b. Refactor `RFQsPage.tsx`
- Remove `statusColors` and `statusLabels` constants — use `ProcurementStatusBadge` and `t()` keys already in procurement.json
- Replace `sortOptions` labels with `t('sortCreatedDesc')` etc. (keys already exist)
- Replace all hardcoded strings with `t()` calls
- Use `PageHeader` + `ProcurementEmptyState` for consistency

### 1c. Refactor `RFQDetailPage.tsx` (~673 lines)
- Add `useTranslation("procurement")` 
- Replace all ~60 hardcoded strings with `t()` calls
- Use `ProcurementStatusBadge` for status badges
- Update `GeneratedPOsCard` sub-component similarly

### 1d. Refactor `useProcurement.ts` toast messages
- Replace all `toast.success("Fornecedor criado")` etc. with a pattern using `i18next.t()` directly (import `i18next` from the library), since hooks don't have React context for `useTranslation`

---

## Phase 2: Conversion Flows (Order → Invoice)

**What exists**: Request → PO conversion already works via `procurement-create-po-from-request` edge function. PO status updates on goods receipt already work.

**What's missing**: PO → Supplier Invoice conversion.

### 2a. Add "Convert to Invoice" button on `PurchaseOrdersPage`
- For orders with status `received`, show a button to create a supplier invoice
- Create a `useConvertPOToInvoice` hook that:
  - Creates a `supplier_invoices` row linked to the PO
  - Copies total amount from PO
  - Updates PO status to `closed`

### 2b. Add `awaiting_receipt` status
- Add to `ProcurementStatusBadge` config (already has styling patterns)
- Add translation keys
- When a PO is `sent` or `confirmed`, the "Awaiting Receipt" state is shown after the supplier confirms

---

## Phase 3: Import Modals (CSV/Excel for Suppliers and Catalog)

### 3a. Supplier Import Modal
- New component `SupplierImportModal.tsx`
- Uses `papaparse` (already installed) for CSV and `xlsx` (already installed) for Excel
- Steps: Upload → Preview table → Validate (name required, email format) → Import
- Add "Import" button to `SuppliersPage` header

### 3b. Catalog Bulk Price Update
- New component `CatalogBulkPriceModal.tsx` 
- Upload CSV/Excel with columns: supplier, product/SKU, new price
- Preview with match status → Confirm to update `supplier_products`
- Add "Import Prices" button to `SupplierProductsPage` header (already has the price import page, but this is a quick inline modal)

---

## Phase 4: Dashboard Enhancements

### 4a. Empty state guidance on `ProcurementDashboardPage`
- When no orders/invoices exist, show instructional cards instead of empty charts
- "Start by adding suppliers, then create purchase requests"

### 4b. Export CSV/PDF buttons
- Add export buttons to orders and invoices tables
- CSV export using `papaparse` unparse
- PDF export using `jspdf` (already installed)

---

## Files to Create
- `src/components/procurement/SupplierImportModal.tsx`
- `src/components/procurement/CatalogBulkPriceModal.tsx`
- `src/hooks/useConvertPOToInvoice.ts`

## Files to Edit
- `src/i18n/locales/{pt,en,es,fr}/procurement.json` — ~40 new keys each
- `src/pages/procurement/RFQsPage.tsx` — full i18n + PageHeader + ProcurementStatusBadge
- `src/pages/procurement/RFQDetailPage.tsx` — full i18n + ProcurementStatusBadge
- `src/hooks/useProcurement.ts` — i18n toast messages
- `src/components/procurement/ProcurementStatusBadge.tsx` — add `awaiting_receipt` status
- `src/pages/procurement/PurchaseOrdersPage.tsx` — add convert-to-invoice button
- `src/pages/procurement/SuppliersPage.tsx` — add import button
- `src/pages/procurement/SupplierProductsPage.tsx` — add bulk price button
- `src/pages/procurement/ProcurementDashboardPage.tsx` — empty state guidance + export

## Execution Order
1. i18n (translations + RFQsPage + RFQDetailPage + toasts) — largest batch
2. Status badge + conversion flow
3. Import modals
4. Dashboard enhancements

