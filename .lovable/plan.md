

# Ask FastCRM — Automation Quotas by Plan + Proactive Suggestions

## Current State

| Aspect | Status |
|---|---|
| `max_automations` in Starter | 3 (too low for "Ask→Automate" to shine) |
| `max_automations` in Growth | 50 |
| `max_automations` in Scale | -1 (unlimited) |
| Quota enforcement on `confirmAutomation` | **None** — no check before creating |
| Multi-condition support | Not gated by plan |
| Multi-action support | Not gated by plan |
| Proactive suggestions | Not implemented |

The current system allows any user to create unlimited automations via Ask, bypassing the `max_automations` limit entirely. The plan limits exist in `check-subscription` but are never enforced in the automation creation flow.

---

## Implementation Plan

### 1. Update Plan Limits

**`supabase/functions/check-subscription/index.ts`**

Change Starter `max_automations` from 3 → 5. Add new boolean flags to all plan tiers:

```
starter:  max_automations: 5,  multi_conditions: false,  multi_actions: false
growth:   max_automations: 50, multi_conditions: true,   multi_actions: false
scale:    max_automations: -1, multi_conditions: true,   multi_actions: true
```

**`src/contexts/SubscriptionContext.tsx`**

Add `multi_conditions: boolean` and `multi_actions: boolean` to `PlanLimits`. Update `STARTER_LIMITS`, `FEATURE_REQUIRED_PLAN`, and `PLAN_INFO` features lists accordingly.

### 2. Enforce Quota on Automation Creation

**`src/hooks/useAskFastCRM.ts` — `confirmAutomation()`**

Before inserting, count the workspace's active automations:

```typescript
const { count } = await workspaceClient
  .from("automation_rules")
  .select("*", { count: "exact", head: true })
  .eq("workspace_id", currentWorkspace.id)
  .eq("is_active", true);
```

Compare against `limits.max_automations`. If at limit (`max_automations !== -1 && count >= max_automations`):
- Don't create the rule
- Show upgrade prompt via toast with plan name
- Return early

Also validate:
- If `preview.conditions.length > 1` and `!limits.multi_conditions` → block with upgrade prompt
- If `preview.actions.length > 1` and `!limits.multi_actions` → block with upgrade prompt

### 3. Show Quota in Automation Preview

**`src/components/ask-fastcrm/AskAutomationPreview.tsx`**

Add a subtle quota indicator below the action buttons:

```
3 of 5 automations used  ·  Upgrade for unlimited
```

This requires passing `currentCount` and `maxAutomations` as props. Fetch the count in the parent (Dialog) and pass down.

When at limit, the "Confirm & Activate" button becomes disabled with text "Limit reached — Upgrade".

### 4. Gate Multi-Conditions/Actions in Edge Function

**`supabase/functions/ask-fastcrm/index.ts` — `handleAutomationIntent()`**

After LLM extraction, check the workspace's plan limits. If Starter:
- Trim conditions array to max 1 (keep first)
- Trim actions array to max 1 (keep first)
- Add a note in the response: `"Your plan supports 1 condition and 1 action per rule."`

This is a server-side guardrail in addition to the frontend check.

### 5. Update Plan Display Info

**`src/contexts/SubscriptionContext.tsx` — `PLAN_INFO`**

Update feature descriptions:

```
starter: ["Up to 5 automations", "1 condition per rule", "1 action per rule", ...]
growth:  ["Up to 50 automations", "Multiple conditions (AND)", "Automation templates", ...]
scale:   ["Unlimited automations", "Multiple actions per rule", "Cross-object rules (coming soon)", ...]
```

**`src/types/saas.ts` — `PLAN_DISPLAY_INFO`**

Sync the same feature strings.

### 6. Proactive Ask Suggestions (Revenue Control)

**New file: `src/hooks/useProactiveAskSuggestions.ts`**

A hook that periodically checks for actionable insights and surfaces them. Runs a lightweight query every 5 minutes (or on dashboard mount):

```typescript
// Check for deals with no activity > 10 days
const { count: staleDeals } = await workspaceClient
  .from("opportunities")
  .select("*", { count: "exact", head: true })
  .eq("workspace_id", currentWorkspace.id)
  .lt("last_activity_at", tenDaysAgo);

// Check for deals closing this week with no next step
const { count: urgentDeals } = await workspaceClient
  .from("opportunities")
  .select("*", { count: "exact", head: true })
  .eq("workspace_id", currentWorkspace.id)
  .lte("close_date", endOfWeek)
  .is("next_step", null);
```

Returns an array of `ProactiveSuggestion`:
```typescript
interface ProactiveSuggestion {
  id: string;
  message: string;        // "You have 4 deals without activity for 10 days."
  askQuery: string;        // "Deals with no activity in 10 days"
  automationQuery?: string; // "Remind me if a deal has no activity for 7 days"
  priority: "high" | "medium";
  icon: string;
}
```

### 7. Proactive Banner in AskFastCRMDialog

**`src/components/ask-fastcrm/AskFastCRMDialog.tsx`**

When the dialog opens and there are proactive suggestions, show them above the suggestion chips:

```
┌──────────────────────────────────────────┐
│ 💡 4 deals have no activity for 10 days. │
│    Want me to create follow-ups?         │
│    [Yes, show deals]  [Create rule]      │
└──────────────────────────────────────────┘
```

- "Yes, show deals" → submits `askQuery` 
- "Create rule" → submits `automationQuery`
- Max 2 proactive suggestions shown at a time
- Dismissable (stored in localStorage per user)

### 8. Proactive Nudge on Dashboard

**`src/components/ask-fastcrm/AskProactiveNudge.tsx`** (new)

A small, dismissable card that can be placed on the dashboard:

```
┌─────────────────────────────────────────┐
│ ⚡ 3 deals are closing this week with   │
│    no next step.                         │
│    [Ask FastCRM]                         │
└─────────────────────────────────────────┘
```

Clicking "Ask FastCRM" opens the dialog pre-filled with the query.

---

## Files to Create / Edit

| File | Change |
|---|---|
| `supabase/functions/check-subscription/index.ts` | Starter max_automations: 5, add `multi_conditions` and `multi_actions` flags per plan |
| `src/contexts/SubscriptionContext.tsx` | Add `multi_conditions`, `multi_actions` to `PlanLimits`, update STARTER_LIMITS, PLAN_INFO, FEATURE_REQUIRED_PLAN |
| `src/hooks/useAskFastCRM.ts` | Add quota check + plan-feature gating before insert in `confirmAutomation` |
| `src/components/ask-fastcrm/AskAutomationPreview.tsx` | Add quota indicator, disable button at limit |
| `supabase/functions/ask-fastcrm/index.ts` | Trim conditions/actions for Starter plan server-side |
| `src/types/saas.ts` | Sync `PLAN_DISPLAY_INFO` feature lists |
| `src/hooks/useProactiveAskSuggestions.ts` | **NEW** — lightweight query for stale/urgent deals |
| `src/components/ask-fastcrm/AskProactiveNudge.tsx` | **NEW** — dashboard nudge card |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | Show proactive suggestions above chips |

## No Database Migration Needed

All quota data comes from `check-subscription` edge function. Active automation count is queried at runtime. No schema changes required.

