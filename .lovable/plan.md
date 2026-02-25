

# Ask FastCRM — Hybrid Architecture (Deterministic + Fallback LLM)

## Current State

The edge function already has:
- 12 intents implemented with full query handlers
- Keyword fast-path (`KEYWORD_MAP`) that skips LLM for known patterns
- LLM fallback via Lovable AI (`gemini-2.5-flash-lite`) with tool-calling
- All action types (`bulk_task`, `bulk_move_stage`, `bulk_assign_owner`, `create_saved_view`, `navigate`, `automation`)
- Query logging to `ask_fastcrm_query_logs`
- Frontend: Dialog (⌘J), Inline panel, ResultPanel with suggestions

## What's Missing for Hybrid Architecture

| Gap | Description |
|---|---|
| **No confidence score** | Keyword classifier returns intent but no confidence (0–1) |
| **No `routed_via`** | Telemetry doesn't track whether deterministic or LLM resolved the query |
| **No structured query JSON** | Response doesn't include the canonical `{ intent, object_type, filters, sort, limit }` schema |
| **No field/operator whitelist** | LLM can theoretically return anything — no guardrails |
| **No "Did you mean?"** | When LLM fails or confidence is low, no fallback suggestions |
| **No bulk confirmation** | Actions affecting >10 items execute immediately without preview |
| **Log table missing columns** | `ask_fastcrm_query_logs` lacks `routed_via` and `confidence` columns |

---

## Implementation Plan

### 1. Database Migration

Add `routed_via` and `confidence` columns to `ask_fastcrm_query_logs`:

```sql
ALTER TABLE public.ask_fastcrm_query_logs
  ADD COLUMN IF NOT EXISTS routed_via text DEFAULT 'deterministic',
  ADD COLUMN IF NOT EXISTS confidence numeric(3,2) DEFAULT 1.0;
```

### 2. Edge Function — Confidence Scoring + Structured Query JSON

**2A. Keyword classifier with confidence**

Replace `classifyByKeyword` to return a confidence score based on match quality:
- Exact phrase match → 0.95
- Partial keyword match → 0.80
- Multiple keyword matches (ambiguous) → 0.50

If confidence ≥ 0.75 → use deterministic path. Otherwise → LLM fallback.

**2B. Structured query JSON in response**

Every response now includes a `query` field alongside the existing `header`, `items`, `actions`:

```typescript
{
  header: "3 deals at risk.",
  query: {
    intent: "deals_at_risk",
    object_type: "deals",
    filters: [{ field: "health_label", op: "=", value: "AT_RISK" }],
    sort: [{ field: "health_score", dir: "asc" }],
    limit: 25
  },
  routed_via: "deterministic",
  confidence: 0.95,
  items: [...],
  actions: [...],
  metric: {...},
  suggestion: {...}
}
```

**2C. Field & operator whitelist for LLM fallback**

Define allowed fields per object type and allowed operators. If LLM returns fields/operators outside the whitelist, reject and return "Did you mean?" suggestions.

```typescript
const ALLOWED_FIELDS = {
  deals: ["value", "stage_id", "owner_id", "last_activity_at", "expected_close_date", "health_label", "ai_next_action", "status", "updated_at"],
  contacts: ["name", "email", "updated_at", "company_id"],
  companies: ["name", "updated_at"],
};
const ALLOWED_OPS = ["=", ">", "<", ">=", "<=", "in", "contains", "is_null", "date_range"];
```

**2D. LLM structured output via tool-calling**

Update the LLM tool definition to return the full structured query schema (not just intent + days). Add `object_type`, `filters`, `sort`, `limit` to the tool parameters. Validate the response against the whitelist.

**2E. "Did you mean?" fallback**

When LLM returns invalid JSON or confidence < 0.5, return:
```typescript
{
  header: "I'm not sure what you mean.",
  items: [],
  actions: [],
  did_you_mean: ["Deals at risk", "No activity", "Closing this month", "Pipeline summary"]
}
```

**2F. Telemetry — log `routed_via` and `confidence`**

Update the non-blocking log insert to include the new fields.

### 3. Frontend — Confirmation for Bulk Actions

**3A. Update `AskResult` interface**

Add `query`, `routed_via`, `confidence`, and `did_you_mean` to the response type.

**3B. "Did you mean?" rendering**

When `result.did_you_mean` is present, render suggestion chips in the result panel that re-trigger the query.

**3C. Bulk action confirmation**

In `useAskFastCRM.executeAction`, when `deal_ids.length > 10`, show a confirmation dialog before executing. Add a `needsConfirmation` check that returns early and sets a pending action state, which the UI renders as a confirmation prompt.

**3D. Update `AskFastCRMResultPanel`**

- Show `routed_via` badge (subtle, for power users — optional debug info)
- Render `did_you_mean` chips
- Show confirmation overlay for bulk actions

---

## Files to Edit

| File | Change |
|---|---|
| `supabase/functions/ask-fastcrm/index.ts` | Confidence scoring, structured query JSON, field whitelist, LLM tool schema update, "Did you mean?", routed_via logging |
| `src/hooks/useAskFastCRM.ts` | Add `query`, `routed_via`, `confidence`, `did_you_mean` to types; add bulk confirmation logic |
| `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx` | Render "Did you mean?" chips and bulk confirmation prompt |

## Migration

One migration adding `routed_via` and `confidence` columns to `ask_fastcrm_query_logs`.

