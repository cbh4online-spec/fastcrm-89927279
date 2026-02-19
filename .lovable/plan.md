
# Conversation Intelligence Engine — AI Deal Insight

## Overview

This feature adds a persistent, auto-updating **AI Deal Insight** panel to every contact/lead detail view. It continuously analyzes all conversation messages across all channels and stores the computed signals in a dedicated `conversation_signals` table. Every time a new message arrives, the signals are recomputed automatically for that contact.

---

## Current State Analysis

**What already exists and will be reused:**

- `supabase/functions/conversation-intelligence/index.ts` — already analyzes conversations and returns `buyingIntent`, `objections`, `urgency`, `dropOffRisk`, `suggestedNextStep`. This is the core AI logic we extend.
- `supabase/functions/compute-lead-behavior-signals/index.ts` — already computes behavioral metrics (response latency, engagement depth, reply rate) per contact and stores to `lead_behavior_signals`. This is the pattern we follow.
- `src/components/contacts/eni/sections/AIInsightsSection.tsx` — existing AI section in the contact detail view (shows `ai_temperature`, `ai_insight`, `ai_next_action`). The new "AI Deal Insight" panel is a separate, richer panel.
- `ghl-webhook-message/index.ts` — already handles inbound messages; we hook into this to trigger signal recomputation.
- `email-webhook/index.ts` and `whatsapp-webhook/index.ts` — same; all webhook handlers will trigger recomputation.
- `MenuSection` type and `EntitySidebarMenu` — the sidebar menu already has an `insights` section; the panel appears inside it.

**What needs to be built:**

| Layer | What |
|---|---|
| DB | New `conversation_signals` table |
| Edge Function | New `compute-conversation-signals` function (aggregates messages → AI classification → upsert to table) |
| Automation | All message webhooks call `compute-conversation-signals` after saving message |
| React Hook | `useConversationSignals(contactId, leadId)` |
| UI Component | `AIDealInsightPanel` — new card inside `insights` section of contact/lead detail |

---

## Architecture

```text
New Inbound/Outbound Message
         │
         ▼
  [Webhook Handler]                    [Manual Refresh button]
  ghl-webhook-message                       │
  email-webhook              ──────────────▼
  whatsapp-webhook      ──►  compute-conversation-signals (new Edge Function)
  instagram-webhook                    │
                                       │ 1. Fetch last 50 messages for contact
                                       │ 2. Call Lovable AI (gemini-3-flash-preview)
                                       │    → buying_intent, trust_level, urgency_level
                                       │    → objection_type, churn_risk
                                       │    → lead_temperature, close_probability
                                       │    → main_blocker, next_best_action
                                       │ 3. Upsert to conversation_signals table
                                       ▼
                              conversation_signals (DB)
                                       │
                                       ▼
                              useConversationSignals hook
                                       │
                                       ▼
                              AIDealInsightPanel (UI)
                         inside 'insights' section of
                         Contact Detail & Lead Detail
```

---

## Files to Create / Edit

| File | Action |
|---|---|
| `supabase/migrations/<ts>_conversation_signals.sql` | Create `conversation_signals` table + RLS |
| `supabase/functions/compute-conversation-signals/index.ts` | New Edge Function |
| `supabase/config.toml` | Register new function |
| `src/hooks/useConversationSignals.ts` | React hook: read + on-demand recompute |
| `src/components/contacts/sections/AIDealInsightPanel.tsx` | New UI panel |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Mount panel in `insights` case |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Mount panel in `insights` case |
| `supabase/functions/ghl-webhook-message/index.ts` | Fire-and-forget call to `compute-conversation-signals` after message save |
| `supabase/functions/email-webhook/index.ts` | Same |
| `supabase/functions/whatsapp-webhook/index.ts` | Same |
| `supabase/functions/instagram-webhook/index.ts` | Same |

---

## 1. Database: `conversation_signals` Table

```sql
CREATE TABLE conversation_signals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id          uuid REFERENCES contacts(id) ON DELETE CASCADE,
  lead_id             uuid REFERENCES leads(id) ON DELETE CASCADE,
  -- Computed signals
  temperature         text CHECK (temperature IN ('cold','evaluating','ready_to_buy','stalling','lost')),
  close_probability   numeric(5,4),           -- 0.0000 to 1.0000
  trust_score         numeric(5,4),
  churn_risk          numeric(5,4),
  main_objection      text CHECK (main_objection IN ('price','timing','authority','competitor','uncertainty','no_need','confusion','none')),
  next_action         text,                   -- natural language recommended action
  recommended_reply   text,                   -- microcopy ready to send
  buying_intent_score numeric(5,4),
  urgency_score       numeric(5,4),
  signals_data        jsonb,                  -- full AI output for detail view
  last_updated        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_per_entity CHECK (
    (contact_id IS NOT NULL AND lead_id IS NULL) OR
    (lead_id IS NOT NULL AND contact_id IS NULL)
  )
);

CREATE UNIQUE INDEX conversation_signals_contact_idx ON conversation_signals(workspace_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX conversation_signals_lead_idx ON conversation_signals(workspace_id, lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE conversation_signals ENABLE ROW LEVEL SECURITY;

-- Workspace members can read
CREATE POLICY "workspace members read signals"
  ON conversation_signals FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Service role manages (for edge function writes)
CREATE POLICY "service role manages signals"
  ON conversation_signals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

The `signals_data` column stores the full AI response for the detail panel (objection suggestions, indicators, etc).

---

## 2. Edge Function: `compute-conversation-signals`

**Accepts:** `{ workspace_id, contact_id?, lead_id? }`  
**Returns:** the computed signals object

**Processing steps:**

1. **Fetch conversations** for the contact/lead (`SELECT id, channel FROM conversations WHERE workspace_id = ? AND (contact_id = ? OR lead_id = ?)`)
2. **Fetch last 80 messages** across those conversations (all channels: ghl, whatsapp, email, instagram, chat, sms), ordered by `created_at ASC`
3. **Build a compact context** — last 40 messages formatted as `[Cliente/Agente]: content`
4. **Call Lovable AI** (`google/gemini-3-flash-preview`) with tool-calling for guaranteed structured output

**AI Tool Schema (new, extending existing `conversation-intelligence` output):**

```json
{
  "name": "compute_deal_signals",
  "parameters": {
    "temperature": { "enum": ["cold","evaluating","ready_to_buy","stalling","lost"] },
    "close_probability": { "type": "number", "minimum": 0, "maximum": 1 },
    "trust_score": { "type": "number", "minimum": 0, "maximum": 1 },
    "churn_risk": { "type": "number", "minimum": 0, "maximum": 1 },
    "buying_intent_score": { "type": "number", "minimum": 0, "maximum": 1 },
    "urgency_score": { "type": "number", "minimum": 0, "maximum": 1 },
    "main_objection": { "enum": ["price","timing","authority","competitor","uncertainty","no_need","confusion","none"] },
    "next_action": { "type": "string" },
    "recommended_reply": { "type": "string", "description": "Ready-to-use Portuguese message" },
    "signals_detail": { ... }
  }
}
```

5. **Upsert** to `conversation_signals` using `ON CONFLICT DO UPDATE`
6. **Return** the result to the caller

---

## 3. Webhook Automation (fire-and-forget)

After each webhook handler saves a message to the DB, add a non-blocking call:

```typescript
// Fire and forget — don't await, don't fail if this errors
(async () => {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compute-conversation-signals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ workspace_id, contact_id, lead_id }),
    });
  } catch { /* silent */ }
})();
```

This triggers in `ghl-webhook-message`, `email-webhook`, `whatsapp-webhook`, and `instagram-webhook` — immediately after the message is persisted.

---

## 4. React Hook: `useConversationSignals`

```typescript
useConversationSignals(contactId?: string, leadId?: string) → {
  signals: ConversationSignals | null,
  isLoading: boolean,
  isRecomputing: boolean,
  recompute: () => Promise<void>,   // on-demand via edge function
  lastUpdated: Date | null,
}
```

Uses `useQuery` to fetch from `conversation_signals` table. `recompute()` calls the edge function and invalidates the query.

---

## 5. UI: `AIDealInsightPanel` Component

New file: `src/components/contacts/sections/AIDealInsightPanel.tsx`

**Layout:**

```
┌────────────────────────────────────────────────────┐
│  🎯 AI Deal Insight           [Refresh icon]        │
│  Última análise: há 3 min                          │
├────────────────────────────────────────────────────┤
│  TEMPERATURA           PROBABILIDADE DE FECHO      │
│  🔥 Ready to Buy              87%                   │
├────────────────────────────────────────────────────┤
│  SCORES                                            │
│  Confiança ████████░░ 78%                         │
│  Urgência  ██████░░░░ 61%                         │
│  Risco Churn ██░░░░░░ 18%                        │
├────────────────────────────────────────────────────┤
│  OBJEÇÃO PRINCIPAL         INTENÇÃO DE COMPRA      │
│  🏷 Preço                    ██████████ 92%         │
├────────────────────────────────────────────────────┤
│  PRÓXIMA AÇÃO RECOMENDADA                          │
│  Enviar proposta revisada focando no ROI           │
├────────────────────────────────────────────────────┤
│  RESPOSTA SUGERIDA         [📋 Copiar]              │
│  "Olá João, tendo em conta o seu feedback..."      │
└────────────────────────────────────────────────────┘
```

**Temperature color coding:**
- `cold` → blue
- `evaluating` → amber
- `ready_to_buy` → green (with highlight)
- `stalling` → orange
- `lost` → red/muted

**Empty state:** "Ainda não há mensagens suficientes para gerar insights. Envie ou receba a primeira mensagem para ativar a análise."

**Where it appears:**
- `ENIContactDetailWithSidebar.tsx` → inside `case 'insights':` block (below `AIInsightsSection`)
- `LeadDetailWithSidebar.tsx` → same pattern

---

## 6. Sidebar Strategic Intelligence Engine Page

Since the previous plan (Strategic Intelligence Engine Weekly Brief) created a `/dashboard/strategy` route and added it to the sidebar under "Estratégia", this new module is added as a **tab** inside that same Strategy page, under a second tab called "Deal Intelligence".

If the strategy page was not yet implemented (the file search shows no existing StrategyPage), both modules are added together:

- Sidebar: "Estratégia" group with items:
  - "Brief Executivo" → `/dashboard/strategy`
  - "Deal Intelligence" → `/dashboard/strategy/deal-intelligence` *(or as a tab on the same page)*

For simplicity and since the Strategy page from the previous plan is already pending implementation, the "Conversation Intelligence Engine" tab is added to the **same Strategy page** as a new tab named "Deal Intelligence", showing workspace-level aggregated signal stats (top objections, average close probability, temperature distribution across all contacts).

---

## Technical Details

- The `compute-conversation-signals` function uses `SUPABASE_SERVICE_ROLE_KEY` (auto-available in edge functions) to read messages and write to `conversation_signals`.
- The webhook automation is **fire-and-forget** — any failure in the signal computation does not affect message delivery or the webhook response.
- Signal computation is idempotent — running it twice produces the same result; the `ON CONFLICT DO UPDATE` upsert pattern (same as `lead_behavior_signals`) ensures no duplicates.
- The UI hook uses `staleTime: 5 * 60 * 1000` (5 minutes) — signals are fresh enough without constant refetching; the webhook automation keeps them updated in near-real-time.
- The `recommended_reply` field is stored in the DB but only displayed in the UI with a copy button — it is never sent automatically.
- The `signals_data` JSONB column stores the full AI output for the detail popover/accordion (objection handling suggestions, urgency indicators, etc.).
- No changes to `MenuSection` type or `EntitySidebarMenu` are needed — the panel is rendered inside the existing `insights` case.
- The existing `conversation-intelligence` edge function (used in Inbox AI panel) remains unchanged — `compute-conversation-signals` is a separate, persistence-focused function that runs in background.
- Rate-limit and 402 errors from Lovable AI in `compute-conversation-signals` are caught silently (logged, not thrown) to avoid breaking webhook responses.
