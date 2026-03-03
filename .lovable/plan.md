

# Enterprise RFQ Template, Supplier Portal & PDF Generator

This is a large feature spanning schema changes, edge functions, a public supplier portal, and enhanced UI. I recommend implementing it in **3 phases** to keep each deliverable testable.

---

## Phase 1: Schema Evolution + Enhanced RFQ Detail UI

### Database Migration

**Alter `rfqs` table** -- add enterprise fields:
- `rfq_number` (text, auto-generated sequence)
- `currency` (text, default 'EUR')
- `payment_terms` (text)
- `delivery_location` (text)
- `quote_validity_days` (integer, default 30)
- `incoterm` (text)
- `buyer_name` (text)
- `buyer_email` (text)
- `pdf_url` (text)

**Alter `rfq_items` table** -- add columns:
- `line_number` (integer)
- `unit` (text, default 'un')

**Alter `rfq_suppliers` table** -- add columns:
- `portal_token` (text, unique)
- `portal_token_expires_at` (timestamptz)
- `responded_at` (timestamptz)

**Alter `rfq_quotes` table** -- add columns:
- `discount_percent` (numeric, default 0)
- `vat_percent` (numeric, default 23)
- `submitted_via_portal` (boolean, default false)

**Create `rfq_quote_audit_log` table**:
- `id`, `rfq_quote_id` (FK), `supplier_id`, `field_changed`, `old_value`, `new_value`, `changed_at`
- No RLS (accessed only via edge functions with service role)

**RLS**: All new columns inherit existing table policies. `rfq_quote_audit_log` gets workspace-scoped SELECT for authenticated users, INSERT via service role only.

**Storage bucket**: `rfq-pdfs` (private), with RLS policy allowing workspace members to read.

### UI: Enhanced RFQ Detail Page

**File: `src/pages/procurement/RFQDetailPage.tsx`**

- Add header section showing: RFQ number, currency, payment terms, delivery location, incoterm, quote validity, buyer info (pulled from workspace + rfq fields)
- Expand items table columns: Line, Produto, SKU, Qty, Unidade, Notas de Especificação
- Keep existing comparison table and modals

**File: `src/hooks/useRFQ.ts`**

- Update `useRFQDetail` rfq query to also select workspace info (company_name, tax_id, billing_address, phone)
- Update items query to include new columns (line_number, unit)

---

## Phase 2: PDF Generator (Enterprise Template)

### Edge Function: `rfq-generate-pdf`

**File: `supabase/functions/rfq-generate-pdf/index.ts`**

- Accepts `{ rfq_id }`, authenticates user via JWT
- Fetches RFQ + workspace + items + suppliers from DB
- Generates PDF using jsPDF with enterprise layout:
  - **Header**: Company logo area, RFQ number, date, deadline, status, currency
  - **Buyer info block**: Company name, NIF, address, buyer contact
  - **Suppliers table**: Name, email, status, sent_at, responded_at
  - **Items table**: Line, Produto, SKU, Qty, Unit, Unit Price (net), Discount %, Final Price, VAT %, Subtotal, Lead Time, MOQ, Pack Size, Notes
  - **Footer**: Legal note, "Responder a esta cotacao" link, signature block
- Uploads PDF to `rfq-pdfs` bucket, updates `rfqs.pdf_url`
- Returns `{ pdf_url }`

### UI Integration

- Replace client-side `handleExportPDF` with call to edge function
- Add download button that fetches from storage URL
- Show "Gerar PDF" button that triggers generation + download

---

## Phase 3: Supplier Portal + Email Templates

### Edge Function: `rfq-supplier-portal-token`

- Generates a secure random token per `rfq_supplier`, stores in `portal_token` with 30-day expiry
- Returns the portal URL: `/supplier-portal/{token}`

### Edge Function: `rfq-submit-quote` (update existing or new)

- Accepts `{ token, quotes: [{ rfq_item_id, unit_price, discount_percent, vat_percent, lead_time_days, min_order_qty, pack_size, notes }] }`
- Validates token, checks expiry
- Upserts `rfq_quotes` for each item, sets `submitted_via_portal = true`
- Updates `rfq_suppliers.status = 'responded'`, sets `responded_at`
- Logs changes to `rfq_quote_audit_log`
- No JWT required (token-based auth)

### Edge Function: `rfq-send` (enhance existing)

- After updating statuses, generate portal tokens for each supplier
- Send email via workspace email or fallback with:
  - RFQ summary (title, deadline, item count)
  - CTA button linking to supplier portal
  - Optionally attach PDF if `pdf_url` exists

### Public Supplier Portal Page

**File: `src/pages/procurement/SupplierPortalPage.tsx`**

- Route: `/supplier-portal/:token` (public, outside dashboard layout)
- On mount, calls edge function to validate token and fetch RFQ data
- Displays read-only RFQ info (buyer company, items list)
- Editable form per item: unit_price, discount_percent, vat_percent, lead_time_days, MOQ, pack_size, notes
- "Enviar Cotacao" button submits via `rfq-submit-quote`
- Success state shows "Cotacao enviada com sucesso"
- Branded with workspace colors if available

### Email Templates (Edge Function based)

**Enhance `rfq-send`** to support 4 email types via a `template` parameter:
- `rfq_sent`: Initial RFQ with portal link
- `rfq_reminder`: Reminder before deadline
- `rfq_thank_you`: After supplier submits quote
- `rfq_awarded`: Notification when supplier wins

Each template is HTML built in the edge function (no external dependency needed), containing: workspace branding, RFQ summary, deadline, and relevant CTA.

---

## Technical Summary

| Component | Files |
|---|---|
| DB Migration | 1 migration (alter 4 tables + create 1 table + storage bucket) |
| Edge Functions | 3 new (`rfq-generate-pdf`, `rfq-supplier-portal-token`, `rfq-submit-quote`) + 1 updated (`rfq-send`) |
| Frontend Pages | 1 new (`SupplierPortalPage.tsx`) + 1 updated (`RFQDetailPage.tsx`) |
| Hooks | 1 updated (`useRFQ.ts`) |
| Routing | Add public route `/supplier-portal/:token` in `App.tsx` |
| i18n | Update `procurement.json` (pt + en) |
| Config | Add `verify_jwt = false` for portal endpoints in `config.toml` note |

### Security
- Portal tokens are random UUIDs with 30-day TTL, scoped to one supplier+RFQ
- Portal edge functions validate token server-side, never expose other workspace data
- PDF storage uses private bucket with workspace-scoped RLS
- All dashboard operations require authenticated workspace member

