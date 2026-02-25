

# Fase 2.3 — Automation Intelligence Engine

## Current State

### What Already Exists (Extensive)
1. **`automation_suggestions` table** — Full schema with id, workspace_id, title, description, trigger_type, trigger_config, conditions, actions, confidence, explanation, pattern_data, status (pending/accepted/dismissed/expired), reviewed_at, reviewed_by, created_automation_id. RLS policies in place.
2. **`ai-automation-suggestions` edge function** (838 lines) — AI-powered (Gemini) pattern analysis. Fetches leads, opportunities, custom fields, existing automations. Analyzes lead patterns, opportunity patterns, custom field patterns. Generates structured suggestions with loop detection, conflict detection, condition validation. Stores in `automation_suggestions` table. **On-demand only** (no cron).
3. **`AutomationSuggestionsPanel`** (533 lines) — Full UI with suggestion cards showing trigger/conditions/actions preview, confidence badge, explanation, and Activate/Edit/Dismiss buttons. Activate creates automation rule as DRAFT. Edit opens the rule builder.
4. **`useAutomationSuggestions` hook** — Fetches pending suggestions with confidence >= 0.7, sorted by confidence DESC.
5. **`AIEntityAutomationSuggestions`** — Entity-specific suggestion UI (per lead/deal/contact).
6. **Dashboard `AIActionSuggestions`** — Shows Revenue Brain actions from intelligence-panel (NOT suggestion cards).

### What's Missing for V2
1. **No heuristic pattern detection** — current system relies 100% on AI (Gemini). Spec wants deterministic V1 heuristics that run without AI credits.
2. **No cron** — suggestions only generated when user clicks "Analisar Padrões".
3. **No `detected_pattern_type`** — can't distinguish repetitive_task vs stage_risk vs no_activity vs invoice_delay.
4. **No guardrails** — no max 5 pending limit, no check against previously dismissed pattern types.
5. **No dashboard integration** — suggestions only visible in Automations page, not on Home dashboard.
6. **No invoice delay pattern** — current analysis doesn't look at invoices at all.

## Plan

### 1. DB Migration: Add `detected_pattern_type` to `automation_suggestions`

Add column:
- `detected_pattern_type` (text, nullable) — values: `repetitive_task`, `stage_risk`, `no_activity`, `invoice_delay`, `ai_generated`

This distinguishes heuristic suggestions from AI-generated ones.

### 2. New Edge Function: `automation-intelligence`

Pure heuristic engine — no AI calls, no API key needed. Runs fast, deterministic.

**Pattern 1 — Repetitive Task**: Query tasks grouped by title. If >5 tasks with similar title exist AND were created within similar timeframes relative to stage changes, generate suggestion to automate that task creation on stage change. Confidence = min(1, count / 10).

**Pattern 2 — Stage Risk**: Query `health_score_history` + `deal_intelligence_cache`. For each pipeline stage, check if >40% of deals that entered it became AT_RISK within the expected_days benchmark. If yes, suggest "create follow-up after X days in stage Y". Confidence = at_risk_ratio.

**Pattern 3 — No Activity**: Count deals with no activity >10 days (from `deal_intelligence_cache` payloads). If >30% of open deals have this problem, suggest automated reminder. Confidence based on ratio.

**Pattern 4 — Invoice Delay**: Query invoices. Calculate average days between due_date and paid_date. If majority are paid late, suggest notification X days before due date. Confidence based on late payment ratio.

**Guardrails built into the function**:
- Check existing pending suggestions count — skip if >= 5
- Check dismissed suggestions — skip pattern types that were dismissed in last 30 days for same workspace
- Minimum confidence 0.7
- Expire old pending suggestions before inserting new ones
- Max 1 suggestion per pattern type

### 3. Cron Job for Periodic Analysis

Schedule `automation-intelligence` to run daily via pg_cron + pg_net. The function iterates all workspaces with sufficient data (>= 10 deals or >= 20 tasks).

### 4. Dashboard Integration: Compact Suggestion Cards

Add a new component `DashboardAutomationSuggestions` to the Dashboard page. Shows up to 2 pending suggestions in a compact card format:
- Headline + confidence badge
- One-line description
- Activate / Dismiss buttons
- "View all" link to Automations page

Place it in the dashboard grid below `AIActionSuggestions` (Revenue Brain).

### 5. Update `useAutomationSuggestions` Hook

Add a `limit` parameter so the dashboard can fetch only 2 suggestions while the full panel fetches all.

## File Summary

| File | Action | Description |
|---|---|---|
| **DB Migration** | **NEW** | Add `detected_pattern_type` column to `automation_suggestions` |
| `supabase/functions/automation-intelligence/index.ts` | **NEW** | Heuristic pattern engine: 4 patterns, guardrails, no AI dependency |
| `src/components/dashboard/DashboardAutomationSuggestions.tsx` | **NEW** | Compact suggestion cards for Home dashboard |
| `src/hooks/useAutomationSuggestions.ts` | **EDIT** | Add `limit` param, expose `detected_pattern_type` in interface |
| `src/pages/Dashboard.tsx` | **EDIT** | Add `DashboardAutomationSuggestions` below Revenue Brain |
| **Cron Job** (SQL insert) | **NEW** | Daily cron calling `automation-intelligence` |

## Technical Details

### Heuristic Pattern Detection Logic

```text
Pattern 1 — Repetitive Task:
  SELECT title, COUNT(*) as cnt 
  FROM tasks 
  WHERE workspace_id = X AND created_at > now() - interval '90 days'
  GROUP BY title HAVING COUNT(*) > 5
  → For each: check if tasks correlate with stage changes
  → confidence = min(1.0, cnt / 10)

Pattern 2 — Stage Risk:
  For each stage with deals:
    at_risk_count = deals in stage with health_label = 'AT_RISK'
    total_in_stage = total deals that entered stage
    ratio = at_risk_count / total_in_stage
    If ratio > 0.4 → suggest follow-up automation
    confidence = ratio

Pattern 3 — No Activity:
  stale_count = deals with last_activity_days > 10
  total = open deals
  ratio = stale_count / total
  If ratio > 0.3 → suggest activity reminder
  confidence = min(1.0, ratio + 0.3)

Pattern 4 — Invoice Delay:
  late_invoices = invoices where paid_date > due_date
  total_paid = invoices with paid_date
  late_ratio = late_invoices / total_paid
  avg_late_days = avg(paid_date - due_date) for late invoices
  If late_ratio > 0.5 → suggest pre-due notification
  confidence = late_ratio
```

### Guardrail Logic
```text
1. SELECT COUNT(*) FROM automation_suggestions 
   WHERE workspace_id = X AND status = 'pending'
   → If >= 5, skip generation entirely

2. SELECT detected_pattern_type FROM automation_suggestions
   WHERE workspace_id = X AND status = 'dismissed' 
   AND reviewed_at > now() - interval '30 days'
   → Skip any pattern type found in this list

3. All suggestions inserted with confidence >= 0.7 only
```

### Dashboard Card Design
```text
┌─────────────────────────────────────────┐
│ ⚡ Automation Suggestions          2 new │
├─────────────────────────────────────────┤
│ 💡 Automate follow-ups in Proposal  82% │
│    You frequently create follow-ups...  │
│    [Activate] [Dismiss]                 │
│─────────────────────────────────────────│
│ 💡 Auto-remind stale deals          78% │
│    30% of deals have no activity...     │
│    [Activate] [Dismiss]                 │
├─────────────────────────────────────────┤
│ View all suggestions →                  │
└─────────────────────────────────────────┘
```

