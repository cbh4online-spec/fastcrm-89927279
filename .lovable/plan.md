

# Implement Command Center Quick Actions: "Gerar PDF da Proposta" and "Agendar Review com Cliente"

## Current State

The `CommandQuickActions` component renders action buttons but all non-navigate actions show placeholder toasts ("Funcionalidade em breve"). The AI orchestrator already returns `entity_id` and `entity_name` in the `CommandResponse`, but these are not passed to the action handlers.

## Changes

### 1. Pass entity context to CommandQuickActions

**File: `src/pages/CommandCenterV2Page.tsx`**

Pass `entity_id` and `entity_name` from `currentResponse` to `CommandQuickActions`:

```tsx
<CommandQuickActions
  actions={currentResponse.result.suggested_actions}
  entityId={currentResponse.entity_id}
  entityName={currentResponse.entity_name}
/>
```

### 2. Implement action handlers in CommandQuickActions

**File: `src/components/command-center-v2/CommandQuickActions.tsx`**

Add `entityId` and `entityName` props. Implement:

- **`generate_report`**: If `target` contains a proposal-related path or entity context suggests a proposal, navigate to `/dashboard/proposals` (or the specific proposal if `entityId` is available). If the target is more generic, navigate to the target path. This lets the user open the existing PDF export dialog from the proposal detail page.

- **`schedule_meeting`**: Use the existing `useTasks` `useCreateTask` mutation to insert a task with:
  - `title`: action label or "Review com Cliente - {entityName}"
  - `related_type`: "opportunity" (when entityId references an opportunity)
  - `related_id`: entityId
  - `due_date`: tomorrow
  - `priority`: "high"
  - Show a success toast with a link to `/dashboard/tasks`

- **`create_task`**: Similar to schedule_meeting but with `priority: "medium"` and no preset title override.

- **`send_email`**: Navigate to `/dashboard/inbox` (or compose view if available).

### 3. Import task creation hook

Use the existing `useCreateTask` from `src/hooks/useTasks.ts` to insert tasks directly from the Command Center without a modal.

## Technical Details

- `CommandQuickActions` gains two optional props: `entityId?: string`, `entityName?: string`
- `useCreateTask` is imported from existing `useTasks.ts` — no new DB tables or migrations needed
- The `generate_report` action navigates to proposal detail where the existing `ProposalDocumentPreviewDialog` handles PDF generation via html2canvas + jsPDF
- For `schedule_meeting`, the task is created immediately with a toast confirmation, avoiding a complex meeting scheduling UI

## Files Modified
- `src/components/command-center-v2/CommandQuickActions.tsx` — implement action handlers
- `src/pages/CommandCenterV2Page.tsx` — pass entity context props

## Files Not Changed
- No edge function changes needed — the orchestrator already returns entity context
- No database migrations — uses existing `tasks` table

