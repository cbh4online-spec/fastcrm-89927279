

# Add Telemetry Events to Intelligence Components

## Current State

- `useCRMAnalytics` hook has ~25 tracked events across Inbox, CRM, AI, Billing, MQPC, and Extension Packs — but zero Intelligence events
- `DealIntelligencePanel` and `CreateTaskFromIntelligence` have no analytics instrumentation
- The hook follows a consistent pattern: `useCallback` wrapping `push(eventName, data)`, returned as named functions

## Plan

### 1. Add 3 tracker functions to `useCRMAnalytics`

**Edit: `src/hooks/useCRMAnalytics.ts`**

Add after the Extension Packs section (~line 354):

- **`trackIntelligencePanelOpened`** — fired when the collapsible panel is expanded
  - Data: `health_label` (bucket), `health_score` (bucketed via `bucketizeScore`), `device_type`
- **`trackNBAClicked`** — fired when a user clicks "Criar tarefa" or "Executar" on the Next Best Action
  - Data: `nba_type` (e.g. `FOLLOW_UP`, `CREATE_TASK`, etc.), `health_label`, `action` (`create_task` | `execute`)
- **`trackTaskCreatedFromIntelligence`** — fired after a task is successfully created from the intelligence panel
  - Data: `nba_type`, `health_label`, `suggested_due_days` (bucketed via `bucketizeDays`)

Add to the return object under a new `// Intelligence` section.

### 2. Instrument `DealIntelligencePanel`

**Edit: `src/components/intelligence/DealIntelligencePanel.tsx`**

- Import `useCRMAnalytics`
- Call `trackIntelligencePanelOpened` inside the `onOpenChange` handler when `isOpen` becomes `true`
- Call `trackNBAClicked` when the "Criar tarefa" button or "Executar" button is clicked (before the existing action)
- Pass `health_label` and `nba_type` down to `CreateTaskFromIntelligence` as new props for the task-created event

### 3. Instrument `CreateTaskFromIntelligence`

**Edit: `src/components/intelligence/CreateTaskFromIntelligence.tsx`**

- Import `useCRMAnalytics`
- After the successful `createTask.mutateAsync` call (before `toast.success`), call `trackTaskCreatedFromIntelligence` with the NBA context passed via props

## Files

| File | Change |
|---|---|
| `src/hooks/useCRMAnalytics.ts` | Add 3 intelligence tracking functions + return them |
| `src/components/intelligence/DealIntelligencePanel.tsx` | Import hook, fire `panel_opened` + `nba_clicked` events |
| `src/components/intelligence/CreateTaskFromIntelligence.tsx` | Import hook, fire `task_created_from_intelligence` on success |

## Privacy

All events follow existing conventions — no PII, no content. Only bucketed scores, enum labels, and device type are sent. The `safePush` gate ensures consent + prod-only enforcement.

