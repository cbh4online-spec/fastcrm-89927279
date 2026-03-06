

# Vertical-Credit — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Create Proposal | `useCreditProposals.ts` | None | None |
| Update Proposal | `useCreditProposals.ts` | None | None |
| Delete Proposal | `useCreditProposals.ts` | None | None |
| Bank Partners CRUD | `useBankPartners.ts` | None | None |
| AI Viability Analysis | `useCreditAI.ts` | None | Toast only |
| AI Bank Matching | `useCreditAI.ts` | None | Toast only |
| AI Doc Extraction | `useCreditAI.ts` | `DOCINT.EXTRACTED` ✓ | `[AI-DOCINT]` ✓ |
| AI Copilot / Optimize | `useCreditAI.ts` | None | Toast only |
| Edge: ai-credit-analysis | `ai-credit-analysis/index.ts` | None | Bare `console.error` |
| Smoke Tests | `system-run-smoke-tests` | — | No `credit_proposals` or `bank_partners` checks |

Zero kernel events for the core credit vertical (case creation, doc upload, status changes). The AI document extraction already has `DOCINT.EXTRACTED` from the ai-docint stabilization. The edge function uses bare `console.error`. No smoke test coverage for credit tables.

## Implementation Plan

### A) Kernel Events (source: `vertical-credit`)

**`useCreditProposals.ts`:**
1. `useCreateCreditProposal` onSuccess → `CREDIT.CASE_CREATED` (entity_kind: `credit_proposal`, payload: `reference_number`, `credit_type`, `amount_requested`, `entity_name`)
2. `useUpdateCreditProposal` onSuccess → `CREDIT.CASE_UPDATED` (entity_kind: `credit_proposal`, payload: `status`, `fields_updated`)
3. `useDeleteCreditProposal` onSuccess → `CREDIT.CASE_DELETED` (entity_kind: `credit_proposal`)

**`useCreditAI.ts`:**
4. `analyzeViability` onSuccess → `CREDIT.AI_ANALYZED` (entity_kind: `credit_proposal`, payload: `viability_score`, `approval_probability`, `risk_level`)
5. `matchBanks` onSuccess → `CREDIT.BANKS_MATCHED` (entity_kind: `credit_proposal`, payload: `recommendations_count`)

**`useBankPartners.ts`:**
6. `useCreateBankPartner` onSuccess → `CREDIT.BANK_ADDED` (entity_kind: `bank_partner`, payload: `name`, `credit_types`)

**`ai-credit-analysis/index.ts`:**
7. No kernel events from edge (no workspace_id available in request body; client-side hooks handle it)

### B) Logging (prefix: `[VERTICAL-CREDIT]`)

**`useCreditProposals.ts`:** Add `[VERTICAL-CREDIT]` logging on create/update/delete success/error

**`useCreditAI.ts`:** Add `[VERTICAL-CREDIT]` prefix on viability/matching/copilot/optimize success/error (doc extraction already has `[AI-DOCINT]`)

**`useBankPartners.ts`:** Add `[VERTICAL-CREDIT]` logging on create/update/delete success/error

**`ai-credit-analysis/index.ts`:** Replace bare `console.error` with `[VERTICAL-CREDIT]` prefix; add success log with mode and model inputs summary

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `credit_proposals` (module: `vertical-credit`)
- `bank_partners` (module: `vertical-credit`)

## File Plan

| File | Action |
|------|--------|
| `src/modules/credit-intermediation/hooks/useCreditProposals.ts` | Import `emitKernelEvent` + `useWorkspace`; emit `CREDIT.CASE_CREATED`, `CREDIT.CASE_UPDATED`, `CREDIT.CASE_DELETED`; add `[VERTICAL-CREDIT]` logging |
| `src/modules/credit-intermediation/hooks/useCreditAI.ts` | Emit `CREDIT.AI_ANALYZED` + `CREDIT.BANKS_MATCHED` on respective successes; add `[VERTICAL-CREDIT]` logging for non-docint operations |
| `src/modules/credit-intermediation/hooks/useBankPartners.ts` | Import `emitKernelEvent` + `useWorkspace`; emit `CREDIT.BANK_ADDED`; add `[VERTICAL-CREDIT]` logging |
| `supabase/functions/ai-credit-analysis/index.ts` | Replace bare `console.error` with `[VERTICAL-CREDIT]` prefix; add success log with mode summary |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `credit_proposals` + `bank_partners` checks under `vertical-credit` module |

