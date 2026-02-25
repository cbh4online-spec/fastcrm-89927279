

# Ask FastCRM — Multi-Object Automation Builder (Deals + Contacts + Invoices)

## Current State

- **Automation intent** exists for deals only, routing to LLM extraction via `handleAutomationIntent()`
- **Allowed triggers**: `opportunity_stage_changed`, `lead_no_response`, `lead_score_changed`, `lead_temperature_changed`
- **Allowed actions**: `create_task`, `assign_owner`, `notify_user`, `move_opportunity_stage`
- **DB `automation_trigger` enum** has many triggers but NO invoice-specific ones (no `invoice_created`, `invoice_overdue`, `due_date_approaching`, `invoice_status_changed`)
- **DB `automation_action_type` enum** has no `mark_as_at_risk` or `send_overdue_alert`
- **`AutomationPreview` interface** has no `object_type` field
- **Extension check**: `useWorkspaceModules` provides `installedModuleIds` — Finance Pack = module slug `invoices`
- **Contact triggers available in DB**: `contact_created`, `contact_updated`, `contact_score_changed`, `contact_temperature_changed` — but NOT `contact_no_activity` or `contact_last_reply_days`

## Database Migration Required

Add to the `automation_trigger` enum:
```sql
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'invoice_created';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'invoice_overdue';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'invoice_status_changed';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'due_date_approaching';
ALTER TYPE automation_trigger ADD VALUE IF NOT EXISTS 'contact_no_activity';
```

Add to the `automation_action_type` enum:
```sql
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'mark_as_at_risk';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'send_overdue_alert';
```

No new tables needed — existing `automation_rules`, `automation_conditions`, `automation_actions` handle all object types via trigger type differentiation.

---

## Implementation Plan

### 1. Edge Function — Multi-Object Automation (`supabase/functions/ask-fastcrm/index.ts`)

**1A. Per-object whitelists**

Replace flat `AUTOMATION_ALLOWED_TRIGGERS` with a per-object structure:

```typescript
const AUTOMATION_OBJECT_CONFIG = {
  deal: {
    triggers: ["opportunity_stage_changed", "lead_no_response", "lead_score_changed", "lead_temperature_changed"],
    actions: ["create_task", "assign_owner", "notify_user", "move_opportunity_stage"],
    condition_fields: ["amount", "stage", "health_label", "close_date", "owner_id"],
  },
  contact: {
    triggers: ["contact_created", "contact_updated", "contact_no_activity", "contact_score_changed"],
    actions: ["create_task", "assign_owner", "notify_user"],
    condition_fields: ["name", "email", "owner_id"],
  },
  invoice: {
    triggers: ["invoice_created", "invoice_overdue", "due_date_approaching", "invoice_status_changed"],
    actions: ["create_task", "notify_user", "mark_as_at_risk", "send_overdue_alert"],
    condition_fields: ["amount", "status", "days_overdue", "due_date"],
    requires_extension: "invoices",
  },
};
```

**1B. Object type detection from natural language**

Add object-type keywords to the deterministic classifier — before routing to LLM:
- "invoice", "fatura", "overdue", "due date" → `object_type: "invoice"`
- "contact", "contacto", "replied", "reply" → `object_type: "contact"`
- Default: `object_type: "deal"`

**1C. Extension gate for invoices**

When `object_type === "invoice"`, check if the `invoices` module is installed for the workspace by querying `workspace_modules`. If not installed, return a response with:
```
headline: "Invoice automations require the Finance Pack."
subtext: "Activate it in Marketplace to unlock invoice rules."
did_you_mean: ["Remind me if a deal has no activity for 7 days", ...]
```

**1D. Update `AUTOMATION_TOOL` LLM definition**

- Add `object_type` as a required field with enum `["deal", "contact", "invoice"]`
- Expand trigger enum to include all per-object triggers
- Expand action enum to include `mark_as_at_risk`, `send_overdue_alert`
- Expand condition field enum to include contact/invoice fields
- Update system prompt to describe all three object types and their allowed triggers/actions

**1E. Update `handleAutomationIntent()`**

- Accept detected `object_type` as parameter
- After LLM extraction, validate trigger/actions/conditions against the per-object config
- Cross-object validation: if LLM returns a trigger from one object with actions from another, reject
- Include `object_type` in the response `automation_preview`
- Update headline: `"You're creating a new automation for {Object}s."`

**1F. Add automation keywords**

Add to `KEYWORD_MAP`:
```
"invoice overdue" → create_automation_rule
"overdue alert" → create_automation_rule  
"due date approaching" → create_automation_rule
"contact created" → create_automation_rule
"contact no reply" → create_automation_rule
"new contact" → create_automation_rule
```

### 2. Frontend Types (`src/hooks/useAskFastCRM.ts`)

**2A. Add `object_type` to `AutomationPreview`**

```typescript
export interface AutomationPreview {
  name: string;
  object_type: "deal" | "contact" | "invoice";  // NEW
  trigger: string;
  trigger_config?: Record<string, any>;
  trigger_label: string;
  conditions: Array<{ field_name: string; operator: string; value: string | null }>;
  conditions_labels: string[];
  actions: Array<{ action_type: string; config: Record<string, any> }>;
  actions_labels: string[];
}
```

**2B. Update `confirmAutomation`**

- Add mapping for new triggers (`contact_created`, `contact_no_activity`, `invoice_overdue`, etc.)
- Add mapping for new action types (`mark_as_at_risk`, `send_overdue_alert`)
- Handle `trigger_config` for invoice-specific params like `days_before_due`

### 3. UI — Multi-Object Preview (`src/components/ask-fastcrm/AskAutomationPreview.tsx`)

**3A. Object-type indicator in header**

Show object type badge in the preview header:
```
⚡ Follow up on Proposal deals     [Deal]
   New automation rule
```

**3B. Edit mode for new trigger types**

Add edit fields for:
- `contact_no_activity` → delay_days input
- `invoice_overdue` → days_overdue input  
- `due_date_approaching` → days_before input
- `invoice_status_changed` → status select

**3C. Edit mode for new action types**

Add edit fields for:
- `mark_as_at_risk` → no config needed (simple flag)
- `send_overdue_alert` → message template input

### 4. Autocomplete (`src/components/ask-fastcrm/AskFastCRMDialog.tsx`)

Add multi-object suggestions:
```typescript
"invoice": "Alert me when invoice is overdue",
"overdue": "Alert me when invoice is overdue",
"contact reply": "Notify me if contact hasn't replied in 14 days",
"new contact": "Create task when new contact is created",
"due date": "Notify me 3 days before invoice due date",
```

### 5. AskFastCRMInline — No changes needed

The inline component already passes through all automation handlers from the Dialog.

---

## Files to Create / Edit

| File | Change |
|---|---|
| **Database migration** | Add 5 trigger values + 2 action type values to enums |
| `supabase/functions/ask-fastcrm/index.ts` | Per-object config, object detection, extension gate, expanded LLM tool, updated handler |
| `src/hooks/useAskFastCRM.ts` | Add `object_type` to `AutomationPreview`, update `confirmAutomation` mappings |
| `src/components/ask-fastcrm/AskAutomationPreview.tsx` | Object badge, edit fields for new trigger/action types |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | Add multi-object autocomplete entries |

## Guardrails Summary

- No cross-object rules (trigger from deal + action from invoice = rejected)
- Invoice automations gated by Finance Pack installation check
- Single trigger, single action per rule (v1)
- All triggers/actions/fields validated against per-object whitelist
- LLM output validated server-side before returning preview

