

# Command Center: Operational Hub Upgrade

## Current State (What Already Works)

After thorough codebase analysis, the system **already has** most of the requested architecture:

| Component | Status | Detail |
|-----------|--------|--------|
| Intent Router | **Exists** | `classifyByKeyword()` + LLM fallback with 20+ intents |
| Action Registry | **Exists (in-memory)** | `actionRegistry.ts` with 20+ executable actions |
| Data Engine | **Exists** | 15 real query handlers (pipeline, risk, forecast, leads, etc.) |
| Response Builder | **Exists** | `buildResponse()` with strict contract |
| Quick Actions | **Partial** | `bulk_task`, `bulk_move_stage`, `bulk_assign_owner`, `create_saved_view` work; `send_followup` and `open_filtered_view` missing |
| Conversation Memory | **In-memory only** | `conversationContextRef` in React, not persisted |
| Kernel Events | **Exists** | 3 events emitted per query (INTENT_DETECTED, ACTION_EXECUTED, RESPONSE_GENERATED) |

## Real Gaps to Fix

### 1. Persist Action Registry to Database
Currently actions are hardcoded in `actionRegistry.ts`. Create a `command_actions` table so the registry is queryable and extensible.

**Migration:**
```sql
CREATE TABLE public.command_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  title TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'Navigate',
  keywords TEXT[] DEFAULT '{}',
  action_type TEXT NOT NULL, -- 'navigate', 'mutation', 'invoke_function'
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, action_key)
);
ALTER TABLE public.command_actions ENABLE ROW LEVEL SECURITY;
```

Seed with existing actions from `actionRegistry.ts` and sync the frontend to query this table first, falling back to in-memory registry.

### 2. Add Missing Quick Actions (Executable, Not Visual)

**a) `send_followup` action type in `useAskFastCRM`:**
- New case in `executeActionInternal` that creates a task of type "followup" with the entity linked
- Uses existing `tasks` table with `related_type` + `related_id`

**b) `open_filtered_view` action type:**
- Navigate to the entity list page with query params encoding the active filters
- e.g., `/dashboard/leads?status=new&inactive_days=14`

**c) Wire these into `ask-fastcrm` responses:**
- Add `send_followup` actions to `queryLeadsInactive`, `queryDealsInactive`, `queryDailyPriorities`
- Add `open_filtered_view` to pipeline/forecast/risk handlers

### 3. Persist Conversation Memory

**Migration:**
```sql
CREATE TABLE public.command_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.command_conversations ENABLE ROW LEVEL SECURITY;
```

**Frontend changes:**
- `AIQuestionBox`: On each message, upsert current session to `command_conversations`
- On mount, load the last active conversation (< 30 min old) to resume context
- "Nova conversa" button creates a new row

### 4. Add `command_center.quick_action_clicked` Kernel Event

Currently only 3 events are emitted. Add a 4th when a user clicks any quick action button in the chat:

**In `useAskFastCRM.executeActionInternal`:**
```typescript
// Before executing the action
await supabase.from('kernel_events').insert({
  workspace_id: currentWorkspace.id,
  event_type: 'COMMAND_CENTER.QUICK_ACTION_CLICKED',
  actor_type: 'user',
  actor_id: user.id,
  entity_type: action.type,
  entity_id: action.id,
  payload: { action_label: action.label, action_type: action.type },
});
```

### 5. Unify Dashboard Widgets with Data Engine

The Command Center cards (`TodayCard`, `PipelineRiskCard`, `DriftAlertsCard`) each fetch their own data independently. Refactor them to use the same query handlers exposed by `ask-fastcrm`:

- Create a shared `useCommandData(intent)` hook that calls `ask-fastcrm` with a specific intent
- `PipelineRiskCard` → uses `deals_at_risk` intent data
- `DriftAlertsCard` → uses `drift_overview` intent data
- This eliminates duplicate queries and ensures consistency between chat answers and card data

---

## Files to Create/Modify

| File | Action |
|------|--------|
| **New migration** | Create `command_actions` + `command_conversations` tables |
| `src/hooks/useAskFastCRM.ts` | Add `send_followup`, `open_filtered_view` action types + kernel event emission |
| `src/hooks/useCommandData.ts` | **New** — shared hook for widget data via ask-fastcrm intents |
| `src/components/command-center/AIQuestionBox.tsx` | Persist/restore conversation memory |
| `supabase/functions/ask-fastcrm/index.ts` | Add `send_followup` and `open_filtered_view` actions to handler responses |
| `src/components/command-center/PipelineRiskCard.tsx` | Use `useCommandData('deals_at_risk')` |
| `src/components/command-center/DriftAlertsCard.tsx` | Use `useCommandData('drift_overview')` |
| `src/lib/actionRegistry.ts` | Add DB sync — query `command_actions` and merge with in-memory actions |

## Execution Order

1. Database migration (tables + RLS)
2. Persist conversation memory
3. Add missing quick actions (`send_followup`, `open_filtered_view`)
4. Add kernel event for quick action clicks
5. Create `useCommandData` hook and unify widgets

