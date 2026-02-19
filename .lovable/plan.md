
# Rebuild: `strategic-intelligence-brief` — Full Data Aggregation

## Problem with Current Implementation

The existing edge function is **missing the real data the plan specifies**. It currently only queries:
- Leads (count only)
- Tasks
- Messages (via conversations join)

It is **missing**:
- Opportunities (won, lost, open, revenue)
- Previous 7-day period comparison for messages and opportunities
- Response time calculation from conversations
- Lead inactivity (no `last_contact_at` > 7 days)
- Revenue computation from won deals

The AI therefore generates guessed/estimated values for `revenue_change`, `conversion_change`, and `response_time_change` rather than real data.

---

## What Needs to Be Rebuilt

The `generateBriefForWorkspace` function inside `supabase/functions/strategic-intelligence-brief/index.ts` needs to be replaced with a complete data aggregation pipeline.

---

## Full Data Pipeline (per workspace, per call)

### Time windows
```
now                = current timestamp
7d_ago             = now - 7 days    (start of "this week")
14d_ago            = now - 14 days   (start of "previous week")
```

### Queries to run in parallel

| # | Table | Query | Output |
|---|-------|-------|--------|
| 1 | `leads` | count `created_at >= 7d_ago` | `leadsThisWeek` |
| 2 | `leads` | count `created_at >= 14d_ago AND < 7d_ago` | `leadsPrevWeek` |
| 3 | `leads` | count `last_contact_at < 7d_ago OR last_contact_at IS NULL` AND status not won/lost | `inactiveLeads` |
| 4 | `opportunities` | count + sum(value) WHERE `status = 'won'` AND `updated_at >= 7d_ago` | `wonThisWeek`, `revenueThisWeek` |
| 5 | `opportunities` | count + sum(value) WHERE `status = 'won'` AND `updated_at >= 14d_ago AND < 7d_ago` | `wonPrevWeek`, `revenuePrevWeek` |
| 6 | `opportunities` | count WHERE `status = 'lost'` AND `updated_at >= 7d_ago` | `lostThisWeek` |
| 7 | `opportunities` | count WHERE `status = 'lost'` AND `updated_at >= 14d_ago AND < 7d_ago` | `lostPrevWeek` |
| 8 | `opportunities` | count WHERE `status = 'open'` (all-time, current snapshot) | `openDeals` |
| 9 | `messages` | count WHERE `workspace_id = ? AND sent_at >= 7d_ago` | `messagesThisWeek` |
| 10 | `messages` | count WHERE `workspace_id = ? AND sent_at >= 14d_ago AND < 7d_ago` | `messagesPrevWeek` |
| 11 | `messages` | fetch last 60 content samples WHERE `workspace_id = ? AND sent_at >= 7d_ago` | message context for AI |
| 12 | `tasks` | count WHERE `status = 'done' AND updated_at >= 7d_ago` | `tasksCompleted` |
| 13 | `tasks` | count WHERE status IN ('pending','todo') | `tasksPending` |
| 14 | `conversations` | fetch `created_at`, `last_message_at` WHERE `created_at >= 7d_ago` | for response time calc |
| 15 | `conversations` | same for previous week | for response time comparison |

> **Note on `messages`:** The `messages` table has a direct `workspace_id` column, so no join via `conversations` is needed — much simpler and faster.

---

## Delta Calculations

All computed in the function (not by AI):

```
leadsChange         = pct_change(leadsThisWeek, leadsPrevWeek)
revenueChange       = pct_change(revenueThisWeek, revenuePrevWeek)
messagesChange      = pct_change(messagesThisWeek, messagesPrevWeek)

conversionThisWeek  = wonThisWeek / (wonThisWeek + lostThisWeek)  [if > 0]
conversionPrevWeek  = wonPrevWeek / (wonPrevWeek + lostPrevWeek)  [if > 0]
conversionChange    = pct_change(conversionThisWeek, conversionPrevWeek)

avgRespThisWeek     = mean(last_message_at - created_at) for conversations this week
avgRespPrevWeek     = mean(last_message_at - created_at) for conversations prev week
responseTimeChange  = pct_change(avgRespThisWeek, avgRespPrevWeek)
                      (negative = faster = good)
```

Helper:
```typescript
function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}
```

---

## Metrics Context Sent to AI

The prompt context block sent to AI becomes:

```
SEMANA ATUAL (últimos 7 dias):
- Leads criados: 23
- Negócios ganhos: 4 (€12.500)
- Negócios perdidos: 2
- Negócios em aberto: 18
- Mensagens trocadas: 156
- Tarefas concluídas: 11 | Pendentes: 7
- Leads inativos (>7 dias sem contacto): 9

SEMANA ANTERIOR (7-14 dias):
- Leads criados: 20
- Negócios ganhos: 3 (€9.200)
- Negócios perdidos: 1
- Mensagens trocadas: 132

VARIAÇÕES CALCULADAS:
- Leads: +15%
- Receita: +35.9%
- Taxa de conversão: +12.5% (40% → 57%)
- Tempo de resposta: -8% (mais rápido)
- Mensagens: +18.2%

TEMPO MÉDIO DE RESPOSTA:
- Esta semana: 4.2h
- Semana anterior: 4.6h

AMOSTRA DE CONVERSAS (últimas 40 mensagens):
[Cliente]: Qual é o preço...
[Agente]: ...
```

---

## `key_metrics` Object Stored in DB

The function **overrides** AI-guessed metrics with the real computed values before inserting:

```json
{
  "leads_change": 15.0,
  "revenue_change": 35.9,
  "conversion_change": 12.5,
  "response_time_change": -8.0,
  "leads_total": 23,
  "won_deals": 4,
  "lost_deals": 2,
  "messages_total": 156,
  "tasks_completed": 11,
  "tasks_pending": 7,
  "inactive_leads": 9,
  "open_deals": 18,
  "revenue_this_week": 12500,
  "avg_response_hours_this_week": 4.2
}
```

---

## Files to Edit

Only **one file** needs to change:

| File | Change |
|---|---|
| `supabase/functions/strategic-intelligence-brief/index.ts` | Replace `generateBriefForWorkspace` with full data aggregation pipeline |

No DB changes, no frontend changes, no hook changes — the data shape stored in `key_metrics` is a superset of what the hook already reads.

---

## Technical Details

- All 15 queries run in parallel using `Promise.all` for performance.
- The `messages` table is queried directly by `workspace_id` (no join needed — the column exists).
- Opportunity `status` values used: `'won'` and `'lost'` (confirmed from `useKPIs.ts` and `useOpportunitiesEnhanced.ts`).
- Response time is computed from `conversations.created_at` vs `conversations.last_message_at` — same approach used in `useOperationalDashboard.ts`.
- The AI tool `generate_weekly_brief` remains unchanged in schema — the AI still provides `summary`, `opportunity`, `risk`, `market_signal`, and `priority_actions` (qualitative fields). All numeric `key_metrics` are overridden with real values after the AI call.
- `revenue_change`, `conversion_change`, `response_time_change` go from being AI-estimated to being real computed values.
- If previous week had 0 won+lost deals (division by zero in conversion), `conversion_change` is set to 0.
- The cron schedule and on-demand call patterns are unchanged.
