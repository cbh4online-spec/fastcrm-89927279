

# FASTCRM Event Map & Event Contract Layer

## Current State

- **`kernel_events` table**: Already exists with fields: `id`, `workspace_id`, `type`, `entity_kind`, `entity_id`, `actor_type`, `actor_id`, `source_module`, `payload`, `idempotency_key`, `correlation_id`, `status`, `processed_at`, `occurred_at`, `ingested_at`, `schema_version`.
- **`emitKernelEvent` helper**: Used across **83+ files / 110+ hooks** — extensive coverage already exists.
- **`kernel-ingest-event` edge function**: Handles ingestion with idempotency, entity registry upsert, and function run logging.
- **Missing**: No `event_registry` catalog table. No event validation. No admin UI for event observability. No `causation_id` or `metadata_json` fields on `kernel_events`.

## What Will Be Built

### 1. Database Migration

**New table: `event_registry`** — Central catalog of all official event contracts.

| Column | Type |
|--------|------|
| id | uuid PK |
| event_name | text UNIQUE NOT NULL |
| domain | text NOT NULL |
| entity_type | text NOT NULL |
| source_module | text NOT NULL |
| description | text |
| payload_schema_json | jsonb |
| is_active | boolean DEFAULT true |
| version | integer DEFAULT 1 |
| created_at | timestamptz |
| updated_at | timestamptz |

RLS: Read for all authenticated. Write restricted to workspace admins.

**ALTER `kernel_events`** — Add missing envelope fields:
- `causation_id text` — links to the event that caused this event
- `metadata_json jsonb DEFAULT '{}'` — additional context (user agent, route, etc.)
- `event_name text` — normalized name (mirrors `type` but follows `domain.entity.action` convention)

### 2. Seed Event Catalog (~120 events)

Insert rows into `event_registry` covering all domains. Naming: `<domain>.<entity>.<action>`.

```text
DOMAINS AND EVENTS:

core.*         — workspace.created, workspace.updated, member.added, member.removed, role.updated
crm.lead.*     — created, updated, deleted, scored, tagged, converted, bulk_deleted, bulk_updated, restored
crm.contact.*  — created, updated, deleted, restored, bulk_deleted, bulk_updated, merged
crm.company.*  — created, updated, deleted, merged, enriched
crm.opportunity.* — created, updated, deleted, stage_changed, stalled, won, lost, score_changed
comm.message.* — sent, received, read, replied
comm.email.*   — sent, received, opened, clicked, bounced, sequence_enrolled
calendar.meeting.* — created, updated, cancelled, completed, rescheduled
productivity.task.* — created, updated, completed, deleted, overdue
forms.submission.* — received, processed
imports.batch.* — started, completed, failed
sales.proposal.* — created, sent, viewed, accepted, rejected
sales.invoice.* — created, sent, paid, overdue, cancelled
sales.order.*  — created, fulfilled, cancelled
marketing.campaign.* — created, updated, launched, paused, completed
marketing.landing.* — created, published, unpublished
store.product.* — created, updated, deleted, published
store.checkout.* — started, completed, abandoned
c2c.listing.*  — created, updated, sold, removed
c2c.review.*   — submitted, approved
b2b.order.*    — created, approved, shipped, completed
b2b.subscription.* — created, cancelled, renewed
community.post.* — created, updated, deleted, pinned, resolved
community.member.* — invited, joined, removed
ai.agent.*     — job_started, job_completed, job_failed
ai.brief.*     — generated, viewed
ai.suggestion.* — created, accepted, dismissed
strategy.goal.* — created, updated, achieved, off_track
strategy.context.* — block_created, block_updated, block_archived, block_verified
strategy.forecast.* — updated, drop_detected
admin.settings.* — updated, deleted
admin.integration.* — configured, connected, failed, disconnected
system.health.* — smoke_passed, smoke_failed, module_degraded
system.kernel.* — decision_created, decision_approved, decision_rejected, action_executed, action_failed
```

### 3. Update `kernel-ingest-event` Edge Function

Add validation step:
- Check if `type` (mapped to `event_name`) exists in `event_registry` and `is_active = true`
- If not registered: still ingest but mark `status = 'unregistered'` (soft validation — doesn't block)
- Validate `workspace_id` and `entity_id` are present
- Populate `event_name` from the normalized `type` field
- Store `causation_id` and `metadata_json` from request body

### 4. Update `emitKernelEvent` Helper

Add optional `causation_id` and `metadata` fields to the params interface. No breaking changes — purely additive.

### 5. Event Map Admin Page: `/dashboard/system/events`

New page with tabs:

**Tab 1 — Event Catalog**: Table of all registered events from `event_registry`, grouped by domain. Shows event name, description, entity type, source module, version, active status.

**Tab 2 — Live Events**: Real-time feed from `kernel_events` with search, domain filter, status filter. Shows event name, entity, source module, timestamp, status badge.

**Tab 3 — Event Volume**: Bar chart showing event counts by domain (last 7 days). Aggregated from `kernel_events`.

**Tab 4 — Module Coverage**: Grid showing each module vs. its expected events from `event_registry`, highlighting which events have been emitted vs. never emitted (coverage %).

**Tab 5 — Failed/Unregistered**: List of events with `status = 'failed'` or `status = 'unregistered'`, with payload viewer.

### 6. Hook: `useEventRegistry`

Query `event_registry` for the catalog viewer. Simple `useQuery` with domain filter.

### 7. Hook: `useEventMapStats`

Aggregates `kernel_events` for volume charts and coverage analysis. Groups by domain, counts by status, computes module coverage.

### 8. Route + Navigation

- Add `/dashboard/system/events` route in `App.tsx`
- Add "Event Map" nav item under the System section in `nav.v1.ts`

---

## Files

| File | Action |
|------|--------|
| New migration SQL | `event_registry` table + ALTER `kernel_events` |
| New seed migration | Insert ~120 event definitions |
| `supabase/functions/kernel-ingest-event/index.ts` | Modified — add validation + new fields |
| `src/lib/kernelEmitter.ts` | Modified — add `causation_id`, `metadata` params |
| `src/pages/EventMapPage.tsx` | New — admin page with 5 tabs |
| `src/hooks/useEventRegistry.ts` | New — catalog query hook |
| `src/hooks/useEventMapStats.ts` | New — volume/coverage stats hook |
| `src/App.tsx` | Modified — add route |
| `src/config/nav.v1.ts` | Modified — add nav item |

## Implementation Order

1. DB migration: `event_registry` table + ALTER `kernel_events`
2. Seed migration: Insert all event definitions
3. Update `kernel-ingest-event` with validation
4. Update `emitKernelEvent` helper
5. Create hooks (`useEventRegistry`, `useEventMapStats`)
6. Build `EventMapPage` with all 5 tabs
7. Route + nav updates

