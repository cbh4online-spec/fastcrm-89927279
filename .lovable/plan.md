

# Replicate Scores, Lifecycle & Audit for Lead Page

## Current State

- **Company**: Has `CompanyScoresCard`, `CompanyLifecycleSection`, `CompanyFirmographicsSection`, `CompanyAuditSection` -- all integrated in overview and audit tabs.
- **Contact**: Already has `ContactScoresCard`, `ContactLifecycleSection`, `ContactAuditSection` integrated (lines 197-199 and 401 of `ENIContactDetailWithSidebar.tsx`). No firmographics needed for contacts.
- **Lead**: Missing all three. The `leads` DB table lacks `icp_fit_score`, `engagement_score`, `pare_score` columns. No `leads_audit_log` table exists.

## Changes Required

### 1. Database Migration

Add score columns to `leads` table and create audit log table:

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS icp_fit_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pare_score integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.leads_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb
);

ALTER TABLE public.leads_audit_log ENABLE ROW LEVEL SECURITY;
-- RLS policy matching existing audit log patterns
```

### 2. New Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useLeadScores.ts` | `useUpdateLeadScores` mutation -- mirrors `useContactScores.ts` but for leads table |
| `src/hooks/useLeadAuditLog.ts` | Query `leads_audit_log` -- mirrors `useContactAuditLog.ts` |

### 3. New Components

| File | Based On |
|------|----------|
| `src/components/leads/sections/LeadScoresCard.tsx` | `ContactScoresCard` -- ICP Fit, Engagement, PARE with editable progress bars |
| `src/components/leads/sections/LeadLifecycleSection.tsx` | `ContactLifecycleSection` -- pipeline with statuses: New, Contacted, Qualified, Customer |
| `src/components/leads/sections/LeadAuditSection.tsx` | `ContactAuditSection` -- audit log table using `useLeadAuditLog` |

### 4. Integration: `LeadDetailWithSidebar.tsx`

- **Overview section** (line 181): Add `LeadScoresCard` + `LeadLifecycleSection` in a 2-column grid before existing content
- **Audit case**: Add `case 'audit'` to the switch returning `<LeadAuditSection leadId={id!} />`
- Update Lead interface in `useLeads.ts` to include the 3 new score fields

### 5. Files Changed Summary

| File | Change |
|------|--------|
| DB migration | Add 3 columns to `leads`, create `leads_audit_log` table + RLS |
| `src/hooks/useLeads.ts` | Add `icp_fit_score`, `engagement_score`, `pare_score` to `Lead` interface |
| `src/hooks/useLeadScores.ts` | **New** -- mutation hook for lead scores |
| `src/hooks/useLeadAuditLog.ts` | **New** -- query hook for lead audit log |
| `src/components/leads/sections/LeadScoresCard.tsx` | **New** -- scores card component |
| `src/components/leads/sections/LeadLifecycleSection.tsx` | **New** -- lifecycle pipeline component |
| `src/components/leads/sections/LeadAuditSection.tsx` | **New** -- audit log table component |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Integrate scores + lifecycle in overview, add audit case |

No changes needed for Contacts -- already fully integrated.

