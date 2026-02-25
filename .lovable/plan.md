

# Ask FastCRM — Strict Output Contract & Hybrid Finalization

## Analysis

The system already has 12 intents, keyword classifier with confidence, LLM fallback with whitelist validation, bulk confirmation, "Did you mean?" chips, and telemetry with `routed_via`/`confidence`. Here are the specific gaps between the current implementation and the requested strict contract:

### Gaps

| Gap | Current | Required |
|---|---|---|
| **No `version` field** | Response has `header`, `items`, `actions` | Must include `"version": "1.0"` |
| **No `answer` object** | Uses flat `header: string` | Must use `answer: { headline, subtext }` |
| **No `actions_available` enum** | Actions use lowercase types (`bulk_task`) | Must use uppercase enum (`CREATE_TASKS_BULK`, `SAVE_VIEW`, etc.) |
| **Wrong whitelist fields** | Uses DB column names (`last_activity_at`, `ai_next_action`) | Must use semantic names (`last_activity_days`, `has_next_step`, `stage`, `stage_days`, `amount`, `close_date`) |
| **Missing operators** | Missing `!=` and `between` | Add both |
| **Sort whitelist not enforced** | No validation of sort fields | Must validate against allowed sort fields |
| **Confidence formula wrong** | Uses fixed 0.95/0.80/0.50 | Must use base 0.5 + 0.2 (keyword) + 0.2 (parameter) |
| **Intent names mismatch** | `pipeline_summary`, `forecast_summary` | Should also support `pipeline_health_summary`, `forecast_risk` |
| **No `headline` char limit** | No enforcement | Max 80 chars for headline, 120 for subtext |
| **LLM model outdated** | Uses `gemini-2.5-flash-lite` | Should use `google/gemini-3-flash-preview` per guidelines |

---

## Implementation Plan

### 1. Edge Function — Strict Contract (`supabase/functions/ask-fastcrm/index.ts`)

**1A. Update response schema**

Every handler returns the strict contract format:

```typescript
interface AskResponse {
  version: "1.0";
  routed_via: "deterministic" | "llm";
  confidence: number;
  intent: string;
  object_type: "deals" | "contacts" | "companies";
  query: {
    filters: { field: string; op: string; value: any }[];
    sort: { field: string; dir: "asc" | "desc" }[];
    limit: number;
  };
  answer: {
    headline: string;   // max 80 chars
    subtext?: string;    // max 120 chars
  };
  actions_available: string[];  // enum: CREATE_TASKS_BULK, SAVE_VIEW, etc.
  items: any[];
  metric?: any;
  suggestion?: any;
  did_you_mean?: string[];
}
```

A `buildResponse()` helper function wraps every handler result to enforce `version`, truncate `headline`/`subtext`, and normalize the output.

**1B. Update field/operator whitelists**

```typescript
const ALLOWED_FIELDS = {
  deals: ["health_score", "health_label", "last_activity_days", "has_next_step", 
          "stage", "stage_days", "amount", "close_date", "owner_id", "created_at", "updated_at"],
  contacts: ["name", "email", "updated_at", "company_id"],
  companies: ["name", "updated_at"],
};
const ALLOWED_OPS = ["=", "!=", ">", ">=", "<", "<=", "in", "between", "contains"];
const ALLOWED_SORT_FIELDS = ["health_score", "amount", "close_date", "last_activity_days", "stage_days", "updated_at"];
```

Validate sort fields from LLM output against `ALLOWED_SORT_FIELDS`.

**1C. Update confidence scoring formula**

Replace fixed confidence values with the additive formula:
- Base: 0.50 if any keyword matches
- +0.20 if primary keyword found (risk, at risk, forecast, closing, no activity, stuck, high value, no next step, pipeline)
- +0.20 if parameter present (e.g. "14 days", "this month", explicit stage name)
- Exact phrase match remains 0.95 (as special case)

**1D. Add `forecast_risk` intent**

Add as alias/new handler: queries deals where `health_label != HEALTHY` AND `close_date` within forecast period. Map keywords "forecast risk", "blocking forecast", "forecast slipping" to this intent.

**1E. Rename `pipeline_summary` → support both `pipeline_summary` and `pipeline_health_summary`**

Both keywords route to the same handler. No breaking change.

**1F. Update `actions_available` to uppercase enum**

Each handler returns `actions_available` as an array of strings: `["CREATE_TASKS_BULK", "SAVE_VIEW", "ASSIGN_OWNER_BULK", "MOVE_STAGE_BULK", "CREATE_AUTOMATION_FROM_TEMPLATE"]` — only the relevant ones per intent. The detailed `actions` array with payloads remains for frontend execution.

**1G. Update LLM model**

Change from `google/gemini-2.5-flash-lite` to `google/gemini-3-flash-preview`.

**1H. Enforce limit bounds**

Clamp `limit` to min 1, max 100, default 25. Applied both to deterministic and LLM paths.

### 2. Frontend Types (`src/hooks/useAskFastCRM.ts`)

**2A. Update `AskResult` interface**

```typescript
export interface AskResult {
  version: string;
  routed_via: "deterministic" | "llm";
  confidence: number;
  intent: string;
  object_type: "deals" | "contacts" | "companies";
  query: AskStructuredQuery;
  answer: {
    headline: string;
    subtext?: string;
  };
  actions_available: string[];
  items: AskResultItem[];
  actions: AskResultAction[];
  metric?: AskResultMetric;
  suggestion?: AskResultSuggestion;
  did_you_mean?: string[];
}
```

Remove the old `header` field from the interface.

### 3. Frontend UI (`src/components/ask-fastcrm/AskFastCRMResultPanel.tsx`)

**3A. Use `answer.headline` instead of `header`**

Replace `result.header` with `result.answer.headline` for the main text. Render `result.answer.subtext` as a secondary line below it.

**3B. Backward compatibility**

Add a fallback: `result.answer?.headline || (result as any).header` so existing cached/in-flight responses don't break.

---

## Files to Edit

| File | Change |
|---|---|
| `supabase/functions/ask-fastcrm/index.ts` | Strict response contract, updated whitelists, confidence formula, `forecast_risk` intent, LLM model upgrade, `buildResponse()` wrapper |
| `src/hooks/useAskFastCRM.ts` | Update `AskResult` interface to match strict contract |
| `src/components/ask-fastcrm/AskFastCRMResultPanel.tsx` | Use `answer.headline`/`subtext` instead of `header` |

## No database migration needed

The `routed_via` and `confidence` columns already exist in `ask_fastcrm_query_logs`.

