

# Module Prompt — All 4 Modules: CRM, Comm Inbox, Context OS, AI Agents

## Current State Summary

| Module | Kernel Events Wired | Smoke Tests | Observability | Gaps |
|--------|-------------------|-------------|---------------|------|
| **CRM** | OPPORTUNITY.UPDATED, STAGE_CHANGED, CLOSED, **CREATED** + **LEAD.CREATED, LEAD.UPDATED, LEAD.STATUS_CHANGED** | `leads_query`, **`opportunities_query`** | ✅ correlation_id + actor_id on all | ✅ All blockers resolved |
| **Comm Inbox** | CONVERSATION.RECEIVED, CONVERSATION.UPDATED, **MESSAGE.SENT** | `conversations_query`, **`messages_query`** | ✅ correlation_id + actor_id on send | ✅ All blockers resolved |
| **Context OS** | CONTEXT.BLOCK_UPDATED, **CONTEXT.STATUS_CHANGED, CONTEXT.RICH_TEXT_UPDATED** | **`context_blocks_query`, `context_fields_query`** | ✅ correlation_id on all | ✅ All blockers resolved |
| **AI Agents** | **AGENT.JOB_DISPATCHED** | `ai_jobs_query`, **`ai_registry_query`** | ✅ correlation_id + agent metadata | ✅ All blockers resolved |

---

## ✅ A) Blockers — ALL RESOLVED

### CRM (Opportunities/Leads)
- [x] `useCreateLead` — emits LEAD.CREATED with correlation_id + actor_id
- [x] `useUpdateLead` — emits LEAD.UPDATED or LEAD.STATUS_CHANGED with correlation_id
- [x] `useCreateOpportunityEnhanced` — emits OPPORTUNITY.CREATED with correlation_id + actor_id
- [x] All existing emitters upgraded with correlation_id + actor_id

### Comm Inbox
- [x] `useSendMessage` — emits MESSAGE.SENT with correlation_id + actor_id
- [x] Includes conversation_id, direction, is_automated in payload

### Context OS
- [x] `useUpdateBlockStatus` — emits CONTEXT.STATUS_CHANGED with correlation_id
- [x] `useUpdateBlockRichText` — emits CONTEXT.RICH_TEXT_UPDATED with correlation_id

### AI Agents
- [x] `useAgentLifecycle.dispatch` — emits AGENT.JOB_DISPATCHED with full metadata
- [x] Includes agent_type, entity_type, trigger_type, queue_position in payload

---

## ✅ D) Smoke Tests — EXPANDED

| Module | Check | Table |
|--------|-------|-------|
| `crm-leads` | leads_query | leads |
| `crm-opportunities` | opportunities_query | opportunities |
| `inbox` | conversations_query | conversations |
| `inbox-messages` | messages_query | messages |
| `context-os` | context_blocks_query | context_blocks |
| `context-os-fields` | context_fields_query | context_fields |
| `ai-agents` | ai_jobs_query | ai_agent_jobs |
| `ai-agents-registry` | ai_registry_query | ai_agent_registry |
| `kernel` | kernel_events_query | kernel_events |

## File Changes

| File | Action |
|------|--------|
| `src/hooks/useLeads.ts` | Added emitKernelEvent to useCreateLead + useUpdateLead with correlation_id + actor_id |
| `src/hooks/useOpportunitiesEnhanced.ts` | Added OPPORTUNITY.CREATED event, upgraded all existing emitters with correlation_id + actor_id |
| `src/hooks/useMessages.ts` | Added MESSAGE.SENT event with correlation_id + actor_id |
| `src/hooks/useContextBlocks.ts` | Added CONTEXT.STATUS_CHANGED + CONTEXT.RICH_TEXT_UPDATED events |
| `src/hooks/useAgentLifecycle.ts` | Added AGENT.JOB_DISPATCHED event with full metadata |
| `supabase/functions/system-run-smoke-tests/index.ts` | Refactored with parallel checks, added 5 new module checks |
