# Decision Intelligence Analytics & Measurement Plan

## Overview

This document defines the analytics implementation for tracking AI agent performance and user interactions within the CRM. The goal is to produce actionable insights for product decisions and AI agent optimization.

**Core Questions We Can Answer:**
- Are AI recommendations being used?
- Do recommendations improve outcomes (reply rate, stage progression, won deals)?
- Which agent outputs correlate with revenue impact?
- Where are users stuck in the workflow?
- What should be improved, removed, or monetized as premium?

---

## 1. Tracking Plan Table

| Event | Description | Properties | Trigger | Notes |
|-------|-------------|------------|---------|-------|
| `recommendation_generated` | Agent produces a recommendation | `workspace_id`, `user_id`, `entity_type`, `entity_id`, `agent_type`, `recommendation_type`, `priority`, `confidence`, `model_version`, `prompt_version`, `used_rag`, `used_cache`, `latency_ms`, `recommendation_id` | After agent execution completes | Links all downstream events via `recommendation_id` |
| `recommendation_viewed` | User sees the recommendation card | All above + `surface` (dashboard/entity_page) | When AgentInsightCard mounts | Tracks view rate in funnel |
| `recommendation_accepted` | User clicks "execute action" | `accept_method` (manual/automation), `time_to_action_seconds` | On action button click | Key conversion metric |
| `recommendation_dismissed` | User ignores/rejects recommendation | `dismiss_reason`, `time_to_action_seconds` | On dismiss action (future) | Tracks rejection patterns |
| `recommendation_rated` | User provides feedback rating | `rating` (1-5) | On feedback submission | Quality signal for model improvement |
| `action_executed` | Recommended action is actually performed | `action_type`, `execution_channel`, `automation_id` | When CRM action completes | Confirms recommendation → action flow |
| `entity_outcome_updated` | Entity state changes post-action | `outcome_type`, `new_stage`, `time_since_action_hours` | On stage change, reply, won/lost | Measures recommendation effectiveness |
| `agent_run_failed` | Agent error or timeout | `error_type`, `error_reason`, `timeout`, `latency_ms` | On agent execution failure | Reliability monitoring |
| `rag_retrieval_quality` | RAG retrieval metrics | `retrieval_candidates`, `chunks_used`, `avg_relevance_score`, `rerank_used` | After RAG retrieval | Context quality monitoring |

---

## 2. Event Properties Reference

### Common Properties (All Events)
```typescript
{
  workspace_id: string;       // Workspace isolation
  user_id: string;            // Who triggered/viewed
  entity_type: 'lead' | 'opportunity' | 'contact' | 'company';
  entity_id: string;          // UUID of the entity
  agent_type: 'lead' | 'opportunity' | 'client' | 'orchestrator';
  recommendation_id: string;  // UUID for attribution tracking
  created_at: timestamp;      // Auto-generated
}
```

### recommendation_generated
```typescript
{
  recommendation_type: 'call' | 'email' | 'whatsapp' | 'proposal' | 'task' | 'nurture' | 'archive';
  priority: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  model_version: string;
  prompt_version: string;
  used_rag: boolean;
  used_cache: boolean;
  latency_ms: number;
}
```

### recommendation_viewed
```typescript
{
  surface: 'dashboard' | 'entity_page' | 'notification' | 'inbox';
}
```

### recommendation_accepted / recommendation_dismissed
```typescript
{
  accept_method?: 'manual' | 'automation';
  dismiss_reason?: 'not_relevant' | 'already_done' | 'wrong_contact_method' | 'other';
  time_to_action_seconds: number;  // Time from view to action
}
```

### action_executed
```typescript
{
  action_type: string;        // The specific action taken
  execution_channel: 'crm' | 'whatsapp' | 'email' | 'calendar';
  automation_id?: string;     // If triggered by automation
}
```

### entity_outcome_updated
```typescript
{
  outcome_type: 'reply_received' | 'stage_progressed' | 'won' | 'lost' | 'stalled';
  new_stage?: string;
  time_since_action_hours: number;
}
```

---

## 3. Decision Intelligence Funnel

```
recommendation_generated
         ↓
recommendation_viewed      → View Rate (%)
         ↓
recommendation_accepted    → Acceptance Rate (%)
         ↓
action_executed            → Execution Rate (%)
         ↓
entity_outcome_updated     → Outcome Lift (%)
```

### Key KPIs

| KPI | Formula | Target |
|-----|---------|--------|
| **View Rate** | `viewed / generated × 100` | >80% |
| **Acceptance Rate** | `accepted / viewed × 100` | >40% |
| **Execution Rate** | `executed / accepted × 100` | >70% |
| **Outcome Lift** | `positive_outcomes / executed × 100` | >25% |
| **Time-to-Action** | `avg(time_to_action_seconds)` | <60s |
| **Agent Failure Rate** | `failed / (generated + failed) × 100` | <5% |
| **Cache Hit Impact** | `avg_latency_cached / avg_latency_uncached` | <0.3 |

---

## 4. Dashboard Specification

### 4.1 Agent Performance Overview

**Purpose:** High-level health check of AI agent system

**Widgets:**
1. **Funnel Chart** - recommendation_generated → viewed → accepted → executed → outcome
2. **KPI Cards** - View rate, Acceptance rate, Execution rate, Outcome lift
3. **Agent Comparison Table** - Metrics by agent_type (lead, opportunity, client)
4. **Trend Line** - Daily/weekly funnel metrics over time

**Filters:**
- Date range
- Agent type
- Entity type
- Confidence level

### 4.2 Recommendation Quality

**Purpose:** Understand which recommendations drive value

**Widgets:**
1. **Acceptance by Recommendation Type** - Bar chart by call/email/proposal/etc.
2. **Outcome Rate by Confidence Level** - Correlation between confidence and success
3. **Rejection Reasons** - Pie chart of dismiss_reason distribution
4. **User Feedback Distribution** - Rating histogram

### 4.3 Latency & Technical Health

**Purpose:** Monitor system performance

**Widgets:**
1. **Latency Distribution** - Histogram of latency_ms
2. **Cache Hit Rate** - Percentage of cached vs fresh responses
3. **RAG Utilization** - Percentage using RAG, avg chunks used
4. **Error Rate Trend** - agent_run_failed over time

### 4.4 Outcome Attribution

**Purpose:** Link AI recommendations to business outcomes

**Widgets:**
1. **Revenue Attribution** - Won deals linked to recommendation_id
2. **Stage Progression** - Opportunities that progressed after recommendation
3. **Response Rate** - Leads/opportunities that replied after recommended action
4. **Time-to-Outcome** - Days from recommendation to positive outcome

---

## 5. Attribution Rules

### Linking AI to Outcomes

1. **Unique Recommendation ID**
   - Every recommendation generates a `recommendation_id`
   - All downstream events reference this ID

2. **Time Windows for Attribution**
   - **24h window:** Direct attribution (high confidence)
   - **72h window:** Assisted attribution (medium confidence)
   - **7d window:** Influenced attribution (low confidence)

3. **Multi-touch Attribution**
   - If multiple recommendations precede an outcome, credit is distributed:
     - Last recommendation: 50%
     - Previous recommendations: 50% ÷ count

---

## 6. Database Schema

### Main Events Table: `ai_analytics_events`

```sql
CREATE TABLE public.ai_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type analytics_event_type NOT NULL,
  recommendation_id UUID,
  entity_type TEXT,
  entity_id UUID,
  agent_type TEXT,
  recommendation_type TEXT,
  priority analytics_priority,
  confidence analytics_confidence,
  -- ... (see full schema in migration)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Daily Aggregates: `ai_analytics_daily_aggregates`

Pre-computed daily metrics for fast dashboard queries.

### Funnel Metrics Function: `get_agent_funnel_metrics()`

Returns funnel metrics by agent type with calculated rates.

---

## 7. Validation Checklist

### Event Firing
- [ ] `recommendation_generated` fires after agent analysis completes
- [ ] `recommendation_viewed` fires when AgentInsightCard mounts
- [ ] `recommendation_accepted` fires on action button click
- [ ] `action_executed` fires when CRM action completes
- [ ] `agent_run_failed` fires on analysis errors

### Data Quality
- [ ] No duplicate events for same action
- [ ] All required properties populated
- [ ] `recommendation_id` links correctly across funnel
- [ ] `time_to_action_seconds` calculated correctly
- [ ] Workspace isolation enforced (RLS)

### Coverage
- [ ] LeadAgentInsightsSection tracks all events
- [ ] OpportunityAIInsightsSection tracks all events
- [ ] Dashboard surfaces track `surface: 'dashboard'`
- [ ] Works for all user roles (owner/admin/agent)

---

## 8. Implementation Status

### ✅ Completed
- [x] Database schema (`ai_analytics_events`, `ai_analytics_daily_aggregates`)
- [x] RLS policies for workspace isolation
- [x] Funnel metrics function (`get_agent_funnel_metrics`)
- [x] Frontend hook (`useAgentAnalytics`)
- [x] Integration in `AgentInsightCard`
- [x] Integration in `LeadAgentInsightsSection`
- [x] Integration in `OpportunityAIInsightsSection`

### 🔲 Future Enhancements
- [ ] Dashboard UI for analytics visualization
- [ ] Daily aggregate computation (cron job)
- [ ] Outcome tracking integration (stage changes, replies)
- [ ] RAG quality event tracking from edge functions
- [ ] `recommendation_dismissed` UI implementation
- [ ] Revenue attribution reports

---

## 9. Usage Examples

### Track recommendation generated (in agent execution)
```typescript
import { useAgentAnalytics, generateRecommendationId } from '@/hooks/useAgentAnalytics';

const { trackRecommendationGenerated } = useAgentAnalytics();

trackRecommendationGenerated({
  entityType: 'lead',
  entityId: leadId,
  agentType: 'lead',
  recommendationId: generateRecommendationId(),
  recommendationType: 'call',
  confidence: 'high',
  usedRag: true,
  usedCache: false,
  latencyMs: 1250,
});
```

### Track action executed
```typescript
const { trackActionExecuted } = useAgentAnalytics();

trackActionExecuted({
  entityType: 'opportunity',
  entityId: opportunityId,
  agentType: 'opportunity',
  recommendationId,
  actionType: 'send_proposal',
  executionChannel: 'email',
});
```

---

## 10. Design Philosophy

> **Track what changes decisions. If no decision is informed, the event should not exist.**

This analytics layer enables the team to confidently decide:
- Which agent behaviors to improve
- Which features to monetize
- Which recommendations to retire
- Where to invest in UX improvements
