

# Ask FastCRM — Natural Language Automation Rules (Ask → Automate)

## Current State

The system already has:
- **Ask FastCRM edge function** with hybrid deterministic + LLM routing, strict JSON contract, whitelists, confidence scoring
- **`automation_rules` table** with conditions, actions, logs — full CRUD via `useAutomations.ts` (`useCreateAutomationRule`)
- **Automation triggers** as a Postgres enum including `opportunity_stage_changed`, `lead_no_response`, `conversation_no_reply`, etc.
- **Automation action types** as enum: `create_task`, `assign_owner`, `notify_user`, `move_opportunity_stage`, `send_message`, etc.
- **AskFastCRMResultPanel** with items, actions, confirmation overlay, "Did you mean?" chips
- **AskFastCRMDialog** with autocomplete, keyboard nav, suggestion chips

## Architecture Overview

```text
User types: "Remind me if no activity for 7 days"
       │
       ▼
┌─────────────────────────┐
│  Ask FastCRM Edge Func  │
│  ┌───────────────────┐  │
│  │ Intent Router     │  │ ← detects "create_automation_rule" intent
│  │ (deterministic +  │  │
│  │  LLM fallback)    │  │
│  └───────┬───────────┘  │
│          ▼              │
│  ┌───────────────────┐  │
│  │ Automation Rule   │  │ ← extracts trigger, conditions, actions
│  │ Extractor (LLM)   │  │   returns structured JSON
│  └───────┬───────────┘  │
│          ▼              │
│  ┌───────────────────┐  │
│  │ Validate against  │  │ ← whitelist triggers, actions, fields
│  │ guardrails        │  │
│  └───────────────────┘  │
└──────────┬──────────────┘
           ▼
┌────────────────────────────┐
│  Frontend: Preview Panel   │
│  When → If → Then          │  ← user reviews, edits params
│  [Edit] [Confirm] [Cancel] │
└──────────┬─────────────────┘
           ▼ (on confirm)
┌──────────────────────────┐
│  useCreateAutomationRule │  ← saves to automation_rules + conditions + actions
│  (existing hook)         │
└──────────────────────────┘
```

## Implementation Plan

### 1. Edge Function — New Intent: `create_automation_rule`

**File: `supabase/functions/ask-fastcrm/index.ts`**

**1A. Add automation keywords to deterministic router**

Add entries to `KEYWORD_MAP` and `EXACT_PHRASES`:
```
"remind me" → create_automation_rule
"alert me" → create_automation_rule
"auto-assign" → create_automation_rule
"notify me when" → create_automation_rule
"create follow-up when" → create_automation_rule
"create task when" → create_automation_rule
```

Confidence: These always route to LLM (confidence set to 0.60) because we need structured extraction, not just classification.

**1B. Add second LLM tool: `extract_automation_rule`**

When intent is `create_automation_rule`, call the LLM with a specialized tool that extracts:

```typescript
const AUTOMATION_TOOL = {
  type: "function",
  function: {
    name: "extract_automation_rule",
    description: "Extract a structured automation rule from a natural language request.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Short name for the rule" },
        trigger: {
          type: "string",
          enum: ["opportunity_stage_changed", "lead_no_response", "conversation_no_reply", "lead_score_changed", "lead_temperature_changed"]
        },
        trigger_config: {
          type: "object",
          properties: {
            delay_days: { type: "number" },
            stage_name: { type: "string" },
          }
        },
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field_name: { type: "string", enum: ["amount", "stage", "health_label", "close_date", "owner_id"] },
              operator: { type: "string", enum: ["equals", "not_equals", "greater_than", "less_than", "is_empty"] },
              value: { type: "string" }
            }
          }
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action_type: { type: "string", enum: ["create_task", "assign_owner", "notify_user", "move_opportunity_stage", "send_message"] },
              config: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  due_in_days: { type: "number" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  message: { type: "string" },
                  stage_name: { type: "string" },
                }
              }
            }
          }
        }
      },
      required: ["name", "trigger", "actions"]
    }
  }
};
```

**1C. Guardrails for automation extraction**

Whitelist of allowed triggers (v1 — deals only):
- `opportunity_stage_changed`
- `lead_no_response` (for "no activity" patterns)
- `lead_score_changed`
- `lead_temperature_changed`

Whitelist of allowed actions (v1):
- `create_task`
- `assign_owner`
- `notify_user`
- `move_opportunity_stage`

Validate extracted rule against whitelists. If invalid, return `did_you_mean` suggestions.

**1D. Response format for automation intent**

Return a new response shape with `intent: "create_automation_rule"` and an `automation_preview` field:

```typescript
{
  version: "1.0",
  routed_via: "llm",
  confidence: 0.85,
  intent: "create_automation_rule",
  object_type: "deals",
  query: { filters: [], sort: [], limit: 0 },
  answer: {
    headline: "You're creating a new automation rule.",
    subtext: "Review the details below and confirm."
  },
  actions_available: ["CONFIRM_AUTOMATION", "CANCEL"],
  items: [],
  actions: [],
  automation_preview: {
    name: "Follow up on Proposal deals",
    trigger: "opportunity_stage_changed",
    trigger_config: { stage_name: "Proposal" },
    trigger_label: "Deal enters \"Proposal\"",
    conditions: [{ field_name: "amount", operator: "greater_than", value: "20000" }],
    conditions_labels: ["Amount > €20,000"],
    actions: [{ action_type: "create_task", config: { title: "Follow up on proposal", due_in_days: 3, priority: "high" } }],
    actions_labels: ["Create task \"Follow up on proposal\" in 3 days"]
  }
}
```

### 2. Frontend — Types Update

**File: `src/hooks/useAskFastCRM.ts`**

**2A. Add `AutomationPreview` interface**

```typescript
export interface AutomationPreview {
  name: string;
  trigger: string;
  trigger_config?: Record<string, any>;
  trigger_label: string;
  conditions: Array<{ field_name: string; operator: string; value: string | null }>;
  conditions_labels: string[];
  actions: Array<{ action_type: string; config: Record<string, any> }>;
  actions_labels: string[];
}
```

**2B. Add `automation_preview` to `AskResult`**

Add optional `automation_preview?: AutomationPreview` to the `AskResult` interface.

**2C. Add `confirmAutomation` action**

New function in `useAskFastCRM` that calls `useCreateAutomationRule` to save the automation from the preview. Maps `automation_preview` fields to the existing `CreateRuleInput` format.

### 3. Frontend — Automation Preview Panel

**New file: `src/components/ask-fastcrm/AskAutomationPreview.tsx`**

A dedicated component rendered when `result.automation_preview` is present:

```text
┌─────────────────────────────────────┐
│  ⚡ You're creating a new rule      │
│                                     │
│  When:                              │
│  ┌─ Deal enters "Proposal" ───────┐ │
│  └────────────────────────────────┘ │
│                                     │
│  If:                                │
│  ┌─ Amount > €20,000 ────────────┐  │
│  └────────────────────────────────┘ │
│                                     │
│  Then:                              │
│  ┌─ Create task "Follow up" in 3d ┐ │
│  └────────────────────────────────┘ │
│                                     │
│  [Edit] [Confirm & Activate] [Cancel]│
└─────────────────────────────────────┘
```

- Each section (When/If/Then) uses the `_labels` arrays for human-readable text
- "Edit" opens inline parameter editing (simple inputs for days, amount, priority, stage name)
- "Confirm & Activate" calls `confirmAutomation` → saves rule → shows toast "Rule activated"
- "Cancel" clears the result

### 4. Integrate into ResultPanel and Dialog

**File: `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx`**

- When `result.intent === "create_automation_rule"` and `result.automation_preview` exists, render `<AskAutomationPreview>` instead of the items list
- The headline and subtext still render normally above the preview

**File: `src/components/ask-fastcrm/AskFastCRMDialog.tsx`**

- Pass `onConfirmAutomation` and `onCancelAutomation` handlers through to ResultPanel
- On successful automation creation, show toast and optionally close dialog

**File: `src/components/ask-fastcrm/AskFastCRMInline.tsx`**

- Same integration — the preview renders inline when automation intent is detected

### 5. Autocomplete for Automation Phrases

**File: `src/components/ask-fastcrm/AskFastCRMDialog.tsx`**

Add automation suggestions to `AUTOCOMPLETE_MAP`:
```typescript
"remind": "Remind me if no activity for 7 days",
"alert": "Alert me when deals are at risk",
"auto-assign": "Auto-assign high value deals",
"follow-up": "Create follow-up when deal enters Proposal",
"notify": "Notify me if close date is in 3 days",
```

### 6. No Database Changes Needed

The existing `automation_rules`, `automation_conditions`, and `automation_actions` tables have everything needed. The `useCreateAutomationRule` hook handles the full insert flow. No migration required.

---

## Files to Create / Edit

| File | Change |
|---|---|
| `supabase/functions/ask-fastcrm/index.ts` | Add `create_automation_rule` intent detection, `extract_automation_rule` LLM tool, guardrails, `automation_preview` in response |
| `src/hooks/useAskFastCRM.ts` | Add `AutomationPreview` interface, `automation_preview` to `AskResult`, `confirmAutomation` function |
| `src/components/ask-fastcrm/AskAutomationPreview.tsx` | **NEW** — When/If/Then preview panel with edit + confirm + cancel |
| `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx` | Render `AskAutomationPreview` when automation intent detected |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | Add automation autocomplete entries, pass confirm/cancel handlers |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | Pass confirm/cancel handlers for automation preview |

