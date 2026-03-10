

# Fix: Proposals must use workspace currency from settings

## Problem
Multiple hardcoded currency values throughout the proposal system:

1. **`src/hooks/useProposals.ts` line 253** — defaults to `"BRL"` when no currency is passed
2. **`src/components/proposals/CreateProposalDialog.tsx` line 144** — formats opportunity value with hardcoded `"BRL"`
3. **`src/components/proposals/CreateProposalDialog.tsx` line 204** — formats offer price with hardcoded `"EUR"`
4. **`CreateProposalDialog` never passes `currency`** to `createProposal.mutateAsync()` (line 246-256)

The workspace's configured currency (stored in `invoice_settings.default_currency`) is completely ignored.

## Solution

### 1. `CreateProposalDialog.tsx`
- Import and use `useInvoiceSettings` to read `settings.default_currency`
- Pass `currency: settings.default_currency` in the `createProposal.mutateAsync()` call (line 254)
- Replace hardcoded `"BRL"` (line 144) and `"EUR"` (line 204) with `settings.default_currency`

### 2. `useProposals.ts`
- Change the fallback on line 253 from `"BRL"` to `"EUR"` as a safer default (EUR is the standard for PT-PT users)

This ensures all new proposals use the currency configured in workspace settings, and the formatting throughout the dialog matches.

