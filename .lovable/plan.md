

# CRM Leads — Kernel V2 Stabilization

## Current State

| Area | Status | Detail |
|------|--------|--------|
| Kernel Events | Partial | `LEAD.CREATED`, `LEAD.UPDATED`, `LEAD.STATUS_CHANGED` wired. Missing: `LEAD.SCORED`, `LEAD.TAGGED`, `LEAD.CONVERTED` |
| Dedup | Exists | `useContactDuplicateCheck` + `useLeadMerge` + `UnifiedDuplicateDialog` already handle email/phone/name fuzzy + merge UX |
| Lifecycle | Exists | `ConvertLeadDialog` converts lead→contact/company with full history migration. No kernel event emitted. |
| Behavior Signals | Works | `compute-lead-behavior-signals` edge function computes and upserts signals. No observability logging. |
| Lead Scoring | Works | `ai-analyze-lead` edge function + `useAnalyzeLead`/`useBulkAnalyzeLeads`. No kernel event on score update. `useUpdateLeadScores` (manual ICP/engagement/PARE) also has no kernel event. |
| Auto-Tags | Exists | `useAutoTags` generates tags via `ai-auto-tags` edge function. `useUpdateConversationTags` saves them. No `LEAD.TAGGED` event. |
| Smoke Tests | Basic | Only `leads_query` count check. No lead-specific behavior/scoring validation. |

## Implementation Plan

### A) Kernel Events — Wire Missing Events

**1. `LEAD.SCORED`** — In `useUpdateLeadScores` (`useLeadScores.ts`), emit on success with `scores` payload. In `useAnalyzeLead` (`useSmartLeads.ts`), emit on success with `lead_score`, `ai_temperature`.

**2. `LEAD.TAGGED`** — In `useUpdateLead` (`useLeads.ts`), detect when `tags` field is in changed fields and emit `LEAD.TAGGED` with `tags` payload.

**3. `LEAD.CONVERTED`** — In `ConvertLeadDialog.tsx`, after successful conversion, emit `LEAD.CONVERTED` with `target_type` (contact/company), `target_id`, `delete_after`.

### B) Observability — compute-lead-behavior-signals

Add timing instrumentation to the edge function:
- Log `[LEAD-BEHAVIOR] lead_id=X latency_ms=Y signals={...}` after computation
- Log conversation/message counts processed

### C) Smoke Test Enhancement

Add `lead-behavior-signals` check to `system-run-smoke-tests`: query `lead_behavior_signals` table count for workspace.

### D) Score Explanation Evidence

`useUpdateLeadScores` already stores scores on the lead record. `ai-analyze-lead` already stores `lead_score_explanation` and `lead_score_factors`. No additional evidence storage needed — just wire kernel events so the decision engine can react.

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useLeadScores.ts` | Emit `LEAD.SCORED` kernel event on success |
| `src/hooks/useSmartLeads.ts` | Emit `LEAD.SCORED` in `useAnalyzeLead.onSuccess` |
| `src/hooks/useLeads.ts` | Detect `tags` in update payload → emit `LEAD.TAGGED` |
| `src/components/crm/ConvertLeadDialog.tsx` | Emit `LEAD.CONVERTED` after successful conversion |
| `supabase/functions/compute-lead-behavior-signals/index.ts` | Add timing + input logging |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `lead-behavior-signals` check |

