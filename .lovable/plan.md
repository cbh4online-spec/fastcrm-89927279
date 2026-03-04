

# Module Prompt — All 4 Modules: CRM, Comm Inbox, Context OS, AI Agents

## Current State Summary

| Module | Kernel Events Wired | Smoke Tests | Observability | Gaps |
|--------|-------------------|-------------|---------------|------|
| **CRM** | OPPORTUNITY.UPDATED, STAGE_CHANGED, CLOSED | `leads_query` (basic count) | None on leads mutations | No LEAD.CREATED/UPDATED/STATUS_CHANGED events, no correlation_id on lead mutations, no OPPORTUNITY.CREATED, no ACTIVITY.ADDED, smoke test only checks count |
| **Comm Inbox** | CONVERSATION.RECEIVED, CONVERSATION.UPDATED (via realtime) | `conversations_query` (basic count) | None on send message | No MESSAGE.SENT event, no correlation_id on useSendMessage, smoke test only checks count |
| **Context OS** | CONTEXT.BLOCK_UPDATED (field save only) | None specific | None | No CONTEXT.STATUS_CHANGED (approve/draft), no CONTEXT.RICH_TEXT_UPDATED, no smoke test for context_blocks+context_fields |
| **AI Agents** | None | `ai_executions_query` (basic count) | None | No AGENT.JOB_DISPATCHED, AGENT.JOB_COMPLETED events, no correlation_id on dispatch, no smoke test for job dispatch flow |

---

## A) Blockers per Module

### CRM (Opportunities/Leads)
- [ ] `useCreateLead` — no kernel event emitted for LEAD.CREATED
- [ ] `useUpdateLead` — no kernel event for LEAD.UPDATED
- [ ] `useCreateOpportunityEnhanced` — no kernel event for OPPORTUNITY.CREATED
- [ ] No `correlation_id` passed from any CRM mutation

### Comm Inbox
- [ ] `useSendMessage` — no kernel event for MESSAGE.SENT
- [ ] No `correlation_id` in message send flow
- [ ] Realtime emitter uses `Date.now()` for idempotency — fragile under rapid updates

### Context OS
- [ ] `useUpdateBlockStatus` — no kernel event for CONTEXT.STATUS_CHANGED
- [ ] `useUpdateBlockRichText` — no kernel event for CONTEXT.RICH_TEXT_UPDATED
- [ ] No smoke test entry for context-os module

### AI Agents
- [ ] `useAgentLifecycle.dispatch` — no kernel event for AGENT.JOB_DISPATCHED
- [ ] No kernel event on job completion (would need to emit from dispatch `onSuccess`)
- [ ] No smoke test beyond basic count query

---

## B) V2 Improvements

### CRM
- [ ] Add `correlation_id` to all CRM emitKernelEvent calls using `generateRequestId()`
- [ ] Include `actor_id` (user.id) in all CRM kernel events
- [ ] Emit LEAD.STATUS_CHANGED when status field changes specifically

### Comm Inbox
- [ ] Add `correlation_id` to message send kernel events
- [ ] Include message metadata (channel, direction) in event payload
- [ ] Add `actor_id` for outbound messages

### Context OS
- [ ] Include block_type and status in event payload for better decision engine input
- [ ] Emit from `useUpdateBlockTags` for CONTEXT.TAGS_UPDATED

### AI Agents
- [ ] Include agent_type, entity_type, trigger_type in dispatch event payload
- [ ] Wire queue position into event payload for observability

---

## C) Kernel Events to Emit

### CRM
| Event | Hook | Trigger |
|-------|------|---------|
| `LEAD.CREATED` | `useCreateLead.onSuccess` | New lead created |
| `LEAD.UPDATED` | `useUpdateLead.onSuccess` | Lead fields updated |
| `OPPORTUNITY.CREATED` | `useCreateOpportunityEnhanced.onSuccess` | New opportunity |

### Comm Inbox
| Event | Hook | Trigger |
|-------|------|---------|
| `MESSAGE.SENT` | `useSendMessage.onSuccess` | Outbound message sent |

### Context OS
| Event | Hook | Trigger |
|-------|------|---------|
| `CONTEXT.STATUS_CHANGED` | `useUpdateBlockStatus.onSuccess` | Block approved/draft |
| `CONTEXT.RICH_TEXT_UPDATED` | `useUpdateBlockRichText.onSuccess` | Rich text saved |

### AI Agents
| Event | Hook | Trigger |
|-------|------|---------|
| `AGENT.JOB_DISPATCHED` | `useAgentLifecycle.dispatchMutation.onSuccess` | Job dispatched |

---

## D) Smoke Test Definitions

Update `system-run-smoke-tests` to add deeper checks:

| Module | Check | Expected |
|--------|-------|----------|
| `crm-leads` | Query leads count | No error |
| `crm-opportunities` | Query opportunities count | No error |
| `inbox` | Query conversations count | No error |
| `inbox-messages` | Query messages count | No error |
| `context-os` | Query context_blocks count | No error |
| `context-os-fields` | Query context_fields count | No error |
| `ai-agents` | Query ai_agent_jobs count | No error |
| `ai-agents-registry` | Query ai_agent_registry count | No error |

---

## E) Observability

All emitters will use `generateRequestId()` for `correlation_id`. The existing `emitKernelEvent` already logs to `system_function_runs` via `kernel-ingest-event`.

---

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useLeads.ts` | Add emitKernelEvent to useCreateLead + useUpdateLead onSuccess |
| `src/hooks/useOpportunitiesEnhanced.ts` | Add emitKernelEvent to useCreateOpportunityEnhanced onSuccess, add correlation_id + actor_id to existing emitters |
| `src/hooks/useMessages.ts` | Add emitKernelEvent to useSendMessage onSuccess |
| `src/hooks/useContextBlocks.ts` | Add emitKernelEvent to useUpdateBlockStatus + useUpdateBlockRichText onSuccess |
| `src/hooks/useAgentLifecycle.ts` | Add emitKernelEvent to dispatchMutation onSuccess |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add crm-opportunities, inbox-messages, context-os, context-os-fields, ai-agents-registry checks |

