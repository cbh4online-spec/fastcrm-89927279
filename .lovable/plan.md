

# MKT Email Marketing — Kernel V2 Stabilization

## Current State

| Area | Status | Gaps |
|------|--------|------|
| Campaign CRUD | Works | `useMarketingCampaigns.ts`: create/update/delete. Zero kernel events, no structured logging |
| Send Campaign | Works | `useSendCampaign` invokes `marketing-send-campaign` edge function. Zero kernel events, no logging |
| Webhook Events | Works | `marketing-webhook` processes Resend events (delivered/opened/clicked/bounced). Zero kernel events |
| Smoke Tests | **None** | No `marketing_campaigns`, `marketing_recipients`, `marketing_events` checks |
| Observability | **None** | No structured logging in hooks |

## Implementation Plan

### A) Kernel Events — `src/hooks/useMarketingCampaigns.ts`

1. **`useCreateCampaign.onSuccess`** → Emit `CAMPAIGN.CREATED` with `campaign_id`, `name`, `segment_id`
2. **`useUpdateCampaign.onSuccess`** → Emit `CAMPAIGN.UPDATED` with `campaign_id`
3. **`useSendCampaign.onSuccess`** → Emit `CAMPAIGN.LAUNCHED` with `campaign_id`
4. **`useDeleteCampaign.onSuccess`** → Emit `CAMPAIGN.DELETED` with `campaign_id`

All events: `source_module: 'mkt-email-marketing'`.

### B) Observability — Structured Logging

All mutations in `useMarketingCampaigns.ts`: `[EMAIL-MKT]` prefixed `console.log` on success, `console.warn` on error.

### C) Smoke Tests

Add to `system-run-smoke-tests`:
- `marketing_campaigns` table check
- `marketing_recipients` table check
- `marketing_events` table check

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useMarketingCampaigns.ts` | Import `emitKernelEvent` + `useWorkspace`; emit events on create/update/send/delete; add `[EMAIL-MKT]` logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `marketing_campaigns`, `marketing_recipients`, `marketing_events` checks under `mkt-email-marketing` |

