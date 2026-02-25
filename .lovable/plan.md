

# Ask FastCRM — Revenue Command Interface

## Architecture Overview

```text
┌──────────────────────────────────────────────────┐
│  UI Layer                                         │
│  ┌─────────────────┐  ┌───────────────────────┐  │
│  │ AskFastCRM      │  │ GlobalSearch (⌘K)     │  │
│  │ CommandDialog    │  │ + "Ask" mode toggle   │  │
│  └────────┬────────┘  └───────────┬───────────┘  │
│           │                       │               │
│           └───────┬───────────────┘               │
│                   ▼                               │
│  ┌─────────────────────────────────────────────┐  │
│  │  useAskFastCRM hook                         │  │
│  │  - sends question to edge function          │  │
│  │  - receives structured response             │  │
│  │  - exposes action handlers                  │  │
│  └────────────────┬────────────────────────────┘  │
└───────────────────┼──────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────┐
│  Edge Function: ask-fastcrm                       │
│  1. Intent classification (LLM tool call)         │
│  2. Data query (Supabase service client)          │
│  3. Structured response assembly                  │
│  Calls: opportunities, deal_intelligence_cache,   │
│         deal_scores, crm_activities,              │
│         revenue_forecasts, contacts               │
└──────────────────────────────────────────────────┘
```

## Technical Details

### 1. Edge Function: `supabase/functions/ask-fastcrm/index.ts`

**Input:** `{ question: string }` + JWT auth + X-Workspace-Id header

**Flow:**
1. Validate auth and workspace
2. Call Lovable AI (`google/gemini-2.5-flash`) with structured tool calling to classify the question into one of these intents:
   - `deals_at_risk` — fetch AT_RISK deals from deal_intelligence_cache
   - `deals_inactive` — fetch deals with no activity in N days (from crm_activities)
   - `closing_soon` — deals with expected_close_date within N days
   - `forecast_summary` — latest revenue_forecasts row
   - `pipeline_summary` — aggregate open opportunities by stage
   - `contacts_inactive` — contacts without recent activity
   - `stage_bottleneck` — stages where avg_days > expected_days (from intelligence-panel logic)
3. Execute the corresponding database query via service client
4. Return structured response

**Response contract:**
```typescript
{
  header: string;           // "3 deals are at risk."
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;      // "Health 42 · Stuck in Proposal"
    value?: number;
    health_label?: string;
    link: string;            // "/dashboard/opportunities?deal=xxx"
  }>;
  actions: Array<{
    id: string;              // "create_tasks_all" | "view_list" | "create_automation"
    label: string;
    icon: string;            // lucide icon name
    type: "bulk_task" | "navigate" | "automation";
    payload?: Record<string, any>;
  }>;
  metric?: {
    label: string;
    value: string;
    trend?: "up" | "down" | "neutral";
  };
}
```

### 2. Frontend Hook: `src/hooks/useAskFastCRM.ts`

- Manages state: `question`, `isLoading`, `result`, `error`
- Calls `supabase.functions.invoke("ask-fastcrm", { body: { question } })`
- Passes workspace header via existing pattern
- Exposes `ask(question)`, `clear()`, `executeAction(actionId, payload)`
- `executeAction` handles:
  - `bulk_task`: Creates tasks for all listed deal IDs via existing tasks table insert
  - `navigate`: Calls `navigate(link)`
  - `create_automation`: Opens automation builder with pre-filled template

### 3. UI Component: `src/components/ask-fastcrm/AskFastCRMDialog.tsx`

A dedicated CommandDialog-style modal (not reusing GlobalSearch, to keep concerns separate):

- **Trigger:** New keyboard shortcut `⌘J` (⌘K already taken by GlobalSearch)
- **Input bar** at top: "Ask about your revenue..."
- **Suggested queries** shown when empty (6 chips: "Deals at risk", "Closing this month", "Pipeline summary", "Inactive deals", "Forecast", "Stage bottlenecks")
- **Result area:**
  - Header text (bold, 1 line)
  - Optional metric card (value + trend arrow)
  - Items list (max 10, each row: title, subtitle, value, health badge, click to navigate)
  - Action buttons bar at bottom (max 3 actions)
- **Design:** Clean, no chat bubbles, no conversation history. Single question → single answer. New question replaces old answer.

### 4. UI Integration Points

**a) TopBar** (`src/components/layout/TopBar.tsx`):
- Add an "Ask FastCRM" button (small, icon + text) next to GlobalSearch
- Clicking opens the dialog

**b) Intelligence Tab** (`src/pages/IntelligencePage.tsx`):
- Replace current `AssistTab` content with an embedded version of AskFastCRM (inline, not modal)
- Reuses the same hook and response renderer

**c) Keyboard shortcut:** `⌘J` globally registered via useEffect in `AskFastCRMDialog`

### 5. Action Execution (Phase 2 — Ask → Act)

Each action button in the response triggers:

| Action ID | Behavior |
|---|---|
| `create_tasks_all` | Bulk insert into `tasks` table for each item's deal ID, with suggested title/priority from the edge function |
| `view_as_list` | Navigate to opportunities page with filter query params matching the result set |
| `create_automation` | Navigate to `/dashboard/automations?create=true&template=opportunity-stale-alert` |
| `update_stage` | Opens stage selector for the specific deal (when single-deal context) |

### 6. Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/ask-fastcrm/index.ts` | Edge function with intent classification + data queries |
| `src/hooks/useAskFastCRM.ts` | Frontend hook |
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | Modal dialog component |
| `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx` | Shared result renderer (used in dialog and inline) |
| `src/components/ask-fastcrm/AskFastCRMInline.tsx` | Inline version for Intelligence tab |
| `src/components/ask-fastcrm/index.ts` | Barrel export |

### 7. Files to Edit

| File | Change |
|---|---|
| `src/components/layout/TopBar.tsx` | Add Ask FastCRM button |
| `src/components/intelligence/AssistTab.tsx` | Replace with AskFastCRMInline |
| `supabase/config.toml` | Add `[functions.ask-fastcrm]` with `verify_jwt = false` |

### 8. Intent → Query Mapping (Edge Function)

| Intent | Query Logic |
|---|---|
| `deals_at_risk` | `deal_intelligence_cache` WHERE `payload->health_label = 'AT_RISK'` |
| `deals_inactive` | `opportunities` LEFT JOIN `crm_activities` WHERE last activity > N days |
| `closing_soon` | `opportunities` WHERE `expected_close_date` within N days + join deal_scores |
| `forecast_summary` | Latest `revenue_forecasts` row for workspace |
| `pipeline_summary` | COUNT opportunities grouped by `pipeline_stages.name` |
| `contacts_inactive` | Contacts without messages/activities in N days |
| `stage_bottleneck` | Stages where avg deal days > expected_days (reuse intelligence-panel logic) |

### 9. UX Rules Enforced

- No conversation history — each query is independent
- Header max 1 sentence
- Items list max 10 rows
- Max 3 action buttons
- Suggested queries as clickable chips (not freeform chat)
- Response appears in < 3s (LLM intent classification + DB query)
- Dialog closes on action execution with toast confirmation

### 10. Analytics

Track via existing `useCRMAnalytics`:
- `ask_fastcrm.query_submitted` (intent, has_results)
- `ask_fastcrm.action_executed` (action_id, items_count)
- `ask_fastcrm.chip_clicked` (chip_label)

