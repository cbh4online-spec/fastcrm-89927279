

# Ask FastCRM — 3-Sprint Implementation Plan

## Current State

**Already built (7 intents):** `deals_at_risk`, `deals_inactive`, `closing_soon`, `forecast_summary`, `pipeline_summary`, `contacts_inactive`, `stage_bottleneck`

**Already built (frontend):** `AskFastCRMDialog` (⌘J), `AskFastCRMInline` (Intelligence tab), `AskFastCRMResultPanel`, TopBar integration, query logging table

**Already built (actions):** `bulk_task` creation, `navigate`, `automation`

---

## SPRINT 1 — Ask → Structured Queries

### 1A. Add 4 missing intents to edge function

Update `supabase/functions/ask-fastcrm/index.ts`:

| New Intent | Query Logic | Data Source |
|---|---|---|
| `deals_no_next_step` | Open opportunities where `ai_next_action IS NULL` AND no pending tasks | `opportunities` LEFT JOIN `tasks` WHERE `status = 'pending'` AND `related_type = 'opportunity'` |
| `deals_stuck_in_stage` | Open deals where `updated_at` is older than the stage's `expected_days` | `opportunities` JOIN `pipeline_stages` — compare `differenceInDays(now, opp.updated_at)` > `stage.expected_days` |
| `high_value_deals` | Top 10 open deals ordered by `value DESC` | `opportunities` WHERE `status = 'open'` ORDER BY `value DESC` LIMIT 10 |
| `overdue_invoices` | Check if invoicing extension is active via `workspace_modules`, then query invoice-related data | Guard with workspace_modules check; return "Extension not active" if missing |

**Note:** `pending_approvals` depends on a B2B approval workflow that doesn't exist in the schema yet. We'll add it as a stub intent that returns "Coming soon" — no fake data.

Update the `INTENT_TOOLS` enum to include all 11 intents. Update the system prompt to describe them. Add 4 new handler functions + the stub.

### 1B. Add "Save as view" chip to suggested queries

Update `AskFastCRMInline.tsx` and `AskFastCRMDialog.tsx` `SUGGESTED_CHIPS` arrays to include 2 new chips: `"No next step"` and `"High value deals"`.

### 1C. Intent classifier — add regex fast-path

Before calling the LLM, add a simple keyword map in the edge function to short-circuit known patterns:

```typescript
const KEYWORD_MAP: Record<string, string> = {
  "at risk": "deals_at_risk",
  "inactive": "deals_inactive",
  "no activity": "deals_inactive",
  "closing": "closing_soon",
  "this month": "closing_soon",
  "forecast": "forecast_summary",
  "pipeline": "pipeline_summary",
  "bottleneck": "stage_bottleneck",
  "stuck": "deals_stuck_in_stage",
  "no next step": "deals_no_next_step",
  "high value": "high_value_deals",
  "overdue": "overdue_invoices",
  "approval": "pending_approvals",
};
```

If a keyword matches, skip the LLM call entirely — instant response. Fall through to LLM only for ambiguous queries.

---

## SPRINT 2 — Ask → Act

### 2A. New action types in hook

Add 3 new action types to `useAskFastCRM.ts`:

| Action Type | Behavior |
|---|---|
| `bulk_move_stage` | `supabase.from("opportunities").update({ stage_id }).in("id", deal_ids)` |
| `bulk_assign_owner` | `supabase.from("opportunities").update({ owner_id }).in("id", deal_ids)` |
| `create_saved_view` | Insert into `core_object_views` with filter config matching the current result set |

### 2B. Edge function — richer action payloads

Update each intent handler to include the new action buttons where relevant:

- `deals_at_risk` → add `[Create follow-ups, Save as view]`
- `deals_inactive` → add `[Create follow-ups, Save as view, Move stage]`
- `deals_stuck_in_stage` → add `[Move stage, Create follow-ups, Create automation]`
- `high_value_deals` → add `[Save as view, Assign owner]`

### 2C. Bulk action execution in hook

Extend `executeAction` switch statement:

```typescript
case "bulk_move_stage": {
  const { deal_ids, target_stage_id } = action.payload;
  await supabase.from("opportunities")
    .update({ stage_id: target_stage_id })
    .in("id", deal_ids);
  toast.success(`${deal_ids.length} deals moved.`);
  break;
}
case "bulk_assign_owner": {
  const { deal_ids, owner_id } = action.payload;
  await supabase.from("opportunities")
    .update({ owner_id })
    .in("id", deal_ids);
  toast.success(`${deal_ids.length} deals reassigned.`);
  break;
}
case "create_saved_view": {
  await supabase.from("core_object_views").insert({
    workspace_id: currentWorkspace.id,
    object_type_id: action.payload.object_type_id,
    name: action.payload.view_name,
    filters: action.payload.filters,
    columns: action.payload.columns,
  });
  toast.success("View saved.");
  break;
}
```

---

## SPRINT 3 — Intelligence Upgrade + Premium Feel

### 3A. Health Score integration

Update intent handlers to join `deal_scores` for real health scores instead of relying only on `deal_intelligence_cache` labels. Sort results by health score ascending (worst first).

### 3B. Auto-suggestions

After returning a result with items, the edge function appends a `suggestion` field:

```typescript
suggestion?: {
  text: string;  // "You have 4 deals with no activity in 14 days. Want me to create follow-ups?"
  action: AskResultAction;
}
```

The `AskFastCRMResultPanel` renders this as a highlighted prompt below the items.

### 3C. Recent queries

Add a `useRecentAskQueries` hook that reads the last 5 entries from `ask_fastcrm_query_logs` for the current user. Show them as "Recent" chips above "Suggested" in the dialog when input is empty.

### 3D. UX polish

- Micro-animations: `framer-motion` fade + slide on result appearance (already partially in place with `animate-in`)
- Loading skeleton instead of spinner
- Keyboard navigation: arrow keys to move through items, Enter to open

---

## Files to Edit

| File | Sprint | Change |
|---|---|---|
| `supabase/functions/ask-fastcrm/index.ts` | 1, 2, 3 | Add 4 intents, keyword fast-path, richer actions, suggestion field |
| `src/hooks/useAskFastCRM.ts` | 2 | Add `bulk_move_stage`, `bulk_assign_owner`, `create_saved_view` action types |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | 1, 3 | Update chips, add recent queries |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | 1 | Update chips |
| `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx` | 2, 3 | Add new action icons, suggestion rendering, loading skeleton |

## Files to Create

| File | Sprint | Purpose |
|---|---|---|
| `src/hooks/useRecentAskQueries.ts` | 3 | Fetch last 5 queries from `ask_fastcrm_query_logs` |

## No database migration needed

All tables already exist. The `opportunities` table has `ai_next_action`, `last_activity_at`, `owner_id`, `stage_id`, `value`. The `tasks` table has `related_type`/`related_id`. The `core_object_views` table exists for saved views. The `ask_fastcrm_query_logs` table exists for recent queries.

