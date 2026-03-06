

# Fix: "Leads sem resposta" query returns deals instead of leads

## Problem
When the user asks "leads sem resposta", the system returns deal information (e.g., "1 deal sem atividade há 14+ dias") because there is no dedicated intent for inactive leads. The LLM classifier maps the query to `deals_inactive` or `daily_priorities`, which primarily return deal data.

## Root Cause
The `ask-fastcrm` edge function has intents for `contacts_inactive` (queries `contacts` table) and `deals_inactive` (queries `opportunities` table), but **no `leads_inactive` intent** that queries the `leads` table specifically.

## Solution

### 1. Add new `leads_inactive` intent

**File: `supabase/functions/ask-fastcrm/index.ts`**

- **Keyword mappings** (both `KEYWORD_MAP` and `PHRASE_MAP`): Add entries like `"leads sem resposta"`, `"leads inativos"`, `"leads sem atividade"`, `"leads parados"`, `"inactive leads"` → `"leads_inactive"`
- **Intent enum**: Add `"leads_inactive"` to the available intents list (line ~431) and the LLM prompt (line ~656)
- **Intent description**: Add `"leads_inactive: leads without recent activity or response"` (line ~666)
- **Default structure** (`buildDefaultStructure`): Add case for `leads_inactive` with `object_type: "leads"`, filter on `updated_at`, sort ascending
- **Actions map** (`actionsForIntent`): Add `leads_inactive` returning `NAVIGATE` actions

### 2. Create `queryLeadsInactive` handler function

New function modeled after `queryContactsInactive` but querying the `leads` table:
- Query `leads` table filtered by `workspace_id`, status `new`/`contacted`, and `updated_at < cutoff`
- Return items with `link: /dashboard/leads/${l.id}` (direct link to each lead)
- Headline: "X leads sem resposta há Y+ dias"
- Action: "Ver leads" → `/dashboard/leads`

### 3. Wire the intent to the handler

In the main `switch` statement (~line 1340), add:
```
case "leads_inactive":
  return await queryLeadsInactive(client, workspaceId, days);
```

### Summary of changes
- **1 file**: `supabase/functions/ask-fastcrm/index.ts`
- Adds ~50 lines (keyword mappings, handler function, switch case)
- The edge function redeploys automatically

