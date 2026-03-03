

# Auto-generate RFQ Number

## Problem
The `rfq_number` column exists but is never populated. The creation edge function (`rfq-create-from-needs`) inserts RFQs without setting `rfq_number`.

## Solution

Create a **database trigger** that auto-generates `rfq_number` on INSERT into `rfqs`, using a sequential format like `RFQ-2026-0001` (year + zero-padded sequence per workspace).

### Database Migration
- Create a sequence-based function `generate_rfq_number()` that:
  - Counts existing RFQs for the workspace in the current year
  - Sets `rfq_number = 'RFQ-YYYY-NNNN'`
- Create a `BEFORE INSERT` trigger on `rfqs` that calls this function

### No frontend changes needed
The UI already displays `rfqData.rfq_number` when present (line 130-132 of `RFQDetailPage.tsx`).

### Backfill existing RFQs
Run a data update to set `rfq_number` for any existing RFQs that have it as NULL.

