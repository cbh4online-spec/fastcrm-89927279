

# B2B-Finance — Kernel V2 Stabilization

## Current State

| Area | File(s) | Kernel Events | Logging |
|------|---------|---------------|---------|
| Subscription CRUD | `useSubscriptions.ts` | None | `console.error` only |
| Subscription Cancel/Activate | `useSubscriptions.ts` | None | `console.error` only |
| Opp→Sub Conversion | `useSubscriptions.ts` | None | `console.error` only |
| Subscription Events | `useSubscriptionEvents.ts` | None | `console.error` only |
| SaaS Metrics (MRR/ARR/churn) | `useSaaSMetrics.ts` | None | None |
| Credit Limit Update | `useClientUsers.ts` | None | Toast only |
| Renewal Usage Ledger | `useRenewalUsage.ts` | None | Toast only |
| Billing Assistant | `useBillingAssistant.ts` + edge fn | None | `[BILLING-ASSISTANT]` (good) |
| Check Renewals | `check-renewals` edge fn | None | Minimal |
| B2B Plan Notify | `b2b-plan-notify-cycle` edge fn | None | Unknown |
| Smoke Tests | `system-run-smoke-tests` | — | No b2b-finance checks |

Zero kernel events across all finance hooks. No standardized logging.

## Implementation Plan

### A) Kernel Events (source: `b2b-finance`)

**`useSubscriptions.ts`:**
1. `useCreateSubscription.onSuccess` → emit `B2B.SUBSCRIPTION_CREATED` (entity_kind: `subscription`, payload: `contact_id`, `company_id`, `mrr_amount`)
2. `useCancelSubscription.onSuccess` → emit `B2B.SUBSCRIPTION_CANCELLED` (payload: `reason`)
3. `useActivateSubscription.onSuccess` → emit `B2B.SUBSCRIPTION_ACTIVATED`
4. `useConvertOpportunityToSubscription.onSuccess` → emit `B2B.SUBSCRIPTION_CONVERTED` (payload: `opportunity_id`)

**`useClientUsers.ts`:**
5. `updateCreditLimit` success → emit `B2B.LIMIT_REACHED` when new limit is set (entity_kind: `client_user`, payload: `credit_limit`)

**`useRenewalUsage.ts`:**
6. `useLogRenewalUsage.onSuccess` → emit `B2B.LEDGER_UPDATED` (entity_kind: `renewal_usage_ledger`, payload: `contract_id`, `amount`, `usage_type`)

**`useSubscriptionEvents.ts`:**
7. `useCreateSubscriptionEvent.onSuccess` → emit `B2B.SUBSCRIPTION_EVENT_LOGGED` (payload: `event_type`, `subscription_id`)

### B) Logging (prefix: `[B2B-FINANCE]`)

**`useSubscriptions.ts`:**
- Create/update/delete/cancel/activate success + errors

**`useSubscriptionEvents.ts`:**
- Create event success/error

**`useRenewalUsage.ts`:**
- Log usage success/error, hours_remaining update

**`useClientUsers.ts`:**
- Credit limit update success/error

**`useSaaSMetrics.ts`:**
- No mutations, read-only — skip

**`useBillingAssistant.ts`:**
- Already has `[BILLING-ASSISTANT]` in edge fn — add `[B2B-FINANCE]` to hook errors

**`check-renewals` edge fn:**
- Align to `[B2B-FINANCE]` prefix

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `subscriptions` (module: `b2b-finance`)
- `subscription_events` (module: `b2b-finance`)
- `renewal_usage_ledger` (module: `b2b-finance`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useSubscriptions.ts` | Import `emitKernelEvent`; emit 4 events; add `[B2B-FINANCE]` logging |
| `src/hooks/useSubscriptionEvents.ts` | Import `emitKernelEvent`; emit `B2B.SUBSCRIPTION_EVENT_LOGGED`; add `[B2B-FINANCE]` logging |
| `src/hooks/useRenewalUsage.ts` | Import `emitKernelEvent`; emit `B2B.LEDGER_UPDATED`; add `[B2B-FINANCE]` logging |
| `src/hooks/useClientUsers.ts` | Import `emitKernelEvent`; emit `B2B.LIMIT_REACHED` on credit limit update; add `[B2B-FINANCE]` logging |
| `src/hooks/useBillingAssistant.ts` | Add `[B2B-FINANCE]` error logging |
| `supabase/functions/check-renewals/index.ts` | Align logging to `[B2B-FINANCE]` prefix |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add 3 b2b-finance table checks |

