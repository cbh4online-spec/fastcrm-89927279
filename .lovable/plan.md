

# PLG Intelligence Engine — Inspired by Attio

## Context

The video shows Attio's Product-Led Growth (PLG) capabilities:
1. **Product Signup Feed**: Syncing product signups into the CRM as a real-time activity feed
2. **Signal-Based Lead Routing**: Automatically routing leads to sales (high-priority) or marketing (nurture) based on scoring signals
3. **Unified Company Records**: All context (emails, calls, AI enrichment) grouped in one view
4. **Workflow Triage**: Automated workflows that classify and route every signup
5. **Pipeline Reporting**: Comprehensive view of the full customer lifecycle

## What FastCRM Already Has
- Lead scoring (`lead_score` field), behavior signals table (`lead_behavior_signals`)
- Visual automation builder with triggers/conditions/actions
- Company enrichment (Google Places, AI, website)
- Marketing campaigns module
- Pipeline health intelligence
- Ask FastCRM command interface

## What's Missing (PLG Gap)
1. **No product signup ingestion** — no webhook/API to receive external product events (signups, activations, upgrades)
2. **No signal-based auto-routing** — leads aren't auto-routed to sales or marketing based on score thresholds
3. **No PLG dashboard** — no view showing signup-to-conversion funnel
4. **No lead triage workflow templates** — no PLG-specific automation templates
5. **No product usage signals** — no way to track feature adoption, activation milestones

## Plan

### 1. Database: Product Signals Table

New table `product_signals` to receive external product events:

| Column | Type | Description |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK | |
| lead_id | uuid FK nullable | Auto-linked lead |
| contact_id | uuid FK nullable | Auto-linked contact |
| email | text | Signup email (used for matching) |
| event_type | text | `signup`, `activation`, `upgrade`, `feature_used`, `trial_started`, `trial_expired` |
| event_data | jsonb | Arbitrary payload (plan, features, etc.) |
| source | text | `api`, `webhook`, `stripe`, `manual` |
| processed | boolean | Whether routing has been applied |
| created_at | timestamptz | |

RLS: workspace-scoped access.

### 2. Edge Function: `ingest-product-signal`

Public webhook endpoint that receives product events and:
1. Validates the payload and API key
2. Inserts into `product_signals`
3. Auto-matches to existing lead/contact by email
4. If no match exists, creates a new lead automatically
5. Updates `lead_score` based on signal type (signup = +20, activation = +30, upgrade = +50)
6. Triggers lead routing rules

### 3. Lead Auto-Routing Engine

New edge function `lead-triage-router` that runs after signal ingestion:

```text
Rules (configurable per workspace):
1. lead_score >= 70 → Assign to sales team, create task "High-priority inbound"
2. lead_score 40-69 → Add to nurture sequence (marketing campaign)
3. lead_score < 40 → Mark as "self-serve", no action
```

Configuration stored in a new `lead_routing_rules` table:
- `id`, `workspace_id`, `name`, `score_min`, `score_max`, `action_type` (assign_owner, add_to_campaign, create_task, move_stage), `action_config` (jsonb), `priority`, `is_active`

### 4. PLG Dashboard Component

New component `PLGSignalsFeed` on the dashboard showing:
- Real-time signup feed (last 20 product signals)
- Signal type badges (signup, activation, upgrade)
- Auto-linked lead/contact with score
- Routing action taken (→ Sales, → Marketing, → Self-serve)
- Mini funnel: Signups → Activated → Qualified → Pipeline

### 5. PLG Automation Templates

Add 4 new automation templates to `automationTemplates.ts`:

1. **Signup → Qualify**: When product signal = signup AND score >= 70, create task for sales
2. **Trial Expiring → Nurture**: When product signal = trial_expired, add to email campaign
3. **Activation → Pipeline**: When product signal = activation, create opportunity in pipeline
4. **Upgrade → Celebrate**: When product signal = upgrade, create task to send thank-you

### 6. Unified Company Context Enhancement

Add a `ProductSignalsSection` to company detail view showing:
- All product signals from contacts in that company
- Aggregate product usage (total signups, activations)
- Company-level PLG score (average of contact scores)

### 7. Ask Integration

Add `plg_signals` intent to Ask FastCRM:
- "How many signups this week?"
- "Which leads activated but aren't in pipeline?"
- "Show high-score leads not assigned to sales"

## File Summary

| File | Action | Description |
|---|---|---|
| **DB Migration** | **NEW** | `product_signals` table + `lead_routing_rules` table |
| `supabase/functions/ingest-product-signal/index.ts` | **NEW** | Webhook to receive product events, auto-match, score, route |
| `supabase/functions/lead-triage-router/index.ts` | **NEW** | Score-based routing engine (sales/marketing/self-serve) |
| `src/hooks/useProductSignals.ts` | **NEW** | Hook to fetch product signals feed |
| `src/hooks/useLeadRoutingRules.ts` | **NEW** | Hook to manage routing rules |
| `src/components/dashboard/PLGSignalsFeed.tsx` | **NEW** | Real-time signup feed + mini funnel on dashboard |
| `src/components/plg/LeadRoutingConfig.tsx` | **NEW** | Settings UI to configure routing rules |
| `src/components/companies/ProductSignalsSection.tsx` | **NEW** | Product signals in company detail |
| `src/data/automationTemplates.ts` | **EDIT** | Add 4 PLG automation templates |
| `src/pages/Dashboard.tsx` | **EDIT** | Add PLGSignalsFeed component |
| `src/pages/Settings.tsx` | **EDIT** | Add Lead Routing config section |
| `supabase/functions/ask-fastcrm/index.ts` | **EDIT** | Add `plg_signals` intent |

## Technical Details

### Signal Ingestion Flow
```text
External App → POST /ingest-product-signal
  ↓
  Validate API key (workspace api_keys table)
  ↓
  Insert into product_signals
  ↓
  Match email → leads/contacts
  ↓
  Update lead_score += signal_weight
  ↓
  Call lead-triage-router
  ↓
  Route: Sales (task) | Marketing (campaign) | Self-serve (tag)
```

### Lead Score Weights
```text
signup         → +20
activation     → +30
feature_used   → +5
trial_started  → +15
trial_expired  → -10
upgrade        → +50
```

### Routing Rules Config
```text
┌──────────────────────────────────────────┐
│ Lead Routing Rules                       │
├──────────────────────────────────────────┤
│ Rule 1: Score ≥ 70                       │
│   → Assign to Sales Team                │
│   → Create task: "High-priority inbound" │
│                                          │
│ Rule 2: Score 40-69                      │
│   → Add to nurture campaign              │
│   → Tag: "marketing-qualified"           │
│                                          │
│ Rule 3: Score < 40                       │
│   → Tag: "self-serve"                    │
│   → No action                            │
├──────────────────────────────────────────┤
│ [+ Add Rule]                             │
└──────────────────────────────────────────┘
```

### PLG Dashboard Card
```text
┌─────────────────────────────────────────┐
│ ⚡ Product Signals              Live    │
├─────────────────────────────────────────┤
│ 📊 Funnel: 42 signups → 18 activated   │
│            → 7 qualified → 3 pipeline   │
│─────────────────────────────────────────│
│ 🟢 john@acme.com signed up      2m ago │
│    Score: 82 → Routed to Sales          │
│ 🔵 sara@startup.io activated    15m ago │
│    Score: 65 → Added to Nurture         │
│ 🟢 mike@corp.com upgraded       1h ago │
│    Score: 95 → Task created             │
├─────────────────────────────────────────┤
│ View all signals →                      │
└─────────────────────────────────────────┘
```

