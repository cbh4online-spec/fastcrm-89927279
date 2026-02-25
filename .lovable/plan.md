

# People Core Object — Evolve Existing Contacts

## Context

The project already has a mature `contacts` table with ~70 columns, 85+ files referencing it, extensive UI (list table, detail page with 15+ sections, create dialog with enrichment + duplicate detection), hooks (`useContacts`, `useSmartContacts`, `useContactEnrichment`, `useContactDuplicates`), and RLS policies. Creating a parallel `people` table would require rewriting the entire system.

The plan evolves the existing `contacts` table by adding missing columns, a field-level audit log, soft delete, and new scoring fields — then updates the UI to expose them.

## Phase 1: Database Migration

### 1A. Add missing columns to `contacts`

New columns to add:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `first_name` | text | NULL | Split name |
| `last_name` | text | NULL | Split name |
| `emails` | jsonb | `'[]'` | Multi-email array `[{email, primary, type}]` |
| `phones` | jsonb | `'[]'` | Multi-phone array `[{number, primary, type}]` |
| `timezone` | text | NULL | Contact timezone |
| `lead_status` | text | `'new'` | Lifecycle: new/contacted/qualified/unqualified/customer/churned |
| `contact_preferences` | jsonb | `'{"email":true,"phone":true,"whatsapp":true}'` | Channel preferences |
| `marketing_opt_in` | boolean | false | GDPR opt-in |
| `consent_record` | jsonb | `'{}'` | Consent audit trail |
| `icp_fit_score` | integer | 0 | ICP fit 0-100 |
| `engagement_score` | integer | 0 | Engagement 0-100 |
| `pare_score` | integer | 0 | PARE score 0-100 |
| `last_email_at` | timestamptz | NULL | Last email timestamp |
| `last_call_at` | timestamptz | NULL | Last call timestamp |
| `next_followup_at` | timestamptz | NULL | Scheduled follow-up |
| `ai_summary` | text | NULL | AI-generated summary |
| `ai_tags` | jsonb | `'[]'` | AI-generated tags |
| `ai_pain_points` | jsonb | `'{}'` | Detected pain points |
| `ai_recommendations` | jsonb | `'{}'` | AI recommendations |
| `ai_risk_flags` | jsonb | `'{}'` | Risk indicators |
| `ai_last_enriched_at` | timestamptz | NULL | Last enrichment |
| `custom_fields` | jsonb | `'{}'` | Extensible custom data |
| `segments` | jsonb | `'[]'` | Segment membership |
| `deleted_at` | timestamptz | NULL | Soft delete marker |
| `updated_by` | uuid | NULL | Last updater |

Data backfill in same migration:
- Split existing `name` into `first_name`/`last_name` using `split_part`
- Copy existing `email` into `emails` jsonb array
- Copy existing `phone` into `phones` jsonb array
- Copy `contact_score` into `engagement_score`
- Copy `ai_analyzed_at` into `ai_last_enriched_at`

### 1B. Create `contact_audit_log` table

```text
contact_audit_log
├── id (uuid PK)
├── workspace_id (uuid NOT NULL, INDEX)
├── contact_id (uuid NOT NULL, FK -> contacts ON DELETE CASCADE, INDEX)
├── changed_by (uuid NULL)
├── changed_at (timestamptz default now())
├── field_name (text NOT NULL)
├── old_value (jsonb)
└── new_value (jsonb)
```

RLS: workspace members can SELECT; INSERT via trigger only.

### 1C. Create triggers

1. **Audit trigger** on `contacts` UPDATE: for each changed field, INSERT a row into `contact_audit_log`
2. **Soft delete filter**: Update existing RLS SELECT policy to add `AND deleted_at IS NULL` (or add a view)

### 1D. Add indexes

- GIN index on `emails`
- GIN index on `phones`
- GIN index on `custom_fields`
- Index on `(workspace_id, lead_status)`
- Index on `(workspace_id, deleted_at)` for soft delete filtering
- Full-text index on `(first_name, last_name, name)` for search

### 1E. Validation triggers

- `icp_fit_score` between 0 and 100
- `engagement_score` between 0 and 100
- `pare_score` between 0 and 100

## Phase 2: Update Hooks & Types

### 2A. Update `ENIContactTypes.ts`

Add all new fields to the `ENIContact` interface.

### 2B. Update `useContacts.ts`

- Add `deleted_at IS NULL` filter to all queries
- Add `softDelete` mutation (sets `deleted_at = now()`)
- Add `restore` mutation (sets `deleted_at = null`)
- Update `Contact` interface with new fields
- Set `updated_by` on every update

### 2C. Update `useSmartContacts.ts`

- Add `deleted_at IS NULL` filter
- Add `lead_status` to `SmartContact` interface
- Add `SmartContactsFilters.lead_status` filter option

### 2D. Create `useContactAuditLog.ts`

New hook to fetch audit log for a contact:
```typescript
useContactAuditLog(contactId: string)
// Returns: { field_name, old_value, new_value, changed_by, changed_at }[]
```

### 2E. Create `useContactScores.ts`

Hook for reading/updating ICP, engagement, and PARE scores.

## Phase 3: UI Updates

### 3A. Contact Detail — New sections

Add to `ENIContactDetailWithSidebar.tsx`:

1. **Scores card** in Overview: 3-column grid showing `icp_fit_score`, `engagement_score`, `pare_score` with circular progress indicators
2. **Lifecycle section**: `lead_status` dropdown with visual pipeline indicator
3. **Preferences section**: `contact_preferences` toggles + `marketing_opt_in` switch + consent info
4. **Follow-up section**: `next_followup_at` date picker + `last_email_at`, `last_call_at` timestamps
5. **Audit tab**: Table showing `contact_audit_log` entries (admin-only, gated by role)

### 3B. Contact Detail — Enhanced Overview

Update the Overview section to show:
- Scores card (ICP / Engagement / PARE) at the top
- Lead status badge next to entity type
- Relationship card with `last_email_at`, `last_call_at`, `next_followup_at`
- Quick actions: Add Task, Log Call, Add Note, Enrich

### 3C. Soft Delete UX

- Replace hard delete with soft delete (set `deleted_at`)
- Add "Archived" filter to list page
- Add "Restore" action on archived contacts
- Update delete confirmation copy

### 3D. List Table — New columns

Add to `SmartContactsTable.tsx` CONTACT_COLUMNS:
- `lead_status` (with colored badge)
- `icp_fit_score`, `engagement_score`, `pare_score`
- `next_followup_at`
- `marketing_opt_in`

Add `lead_status` to filter sidebar groups.

### 3E. New Section Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ContactScoresCard.tsx` | `src/components/contacts/eni/sections/` | 3-score display with edit |
| `ContactLifecycleSection.tsx` | same | Lead status pipeline |
| `ContactPreferencesSection.tsx` | same | Channel prefs + consent |
| `ContactAuditSection.tsx` | same | Audit log table |

### 3F. Create Contact Dialog

Update `CreateContactDialog.tsx`:
- Add `lead_status` select (default: "new")
- Add `first_name` / `last_name` fields (auto-compose into `name`)

## Phase 4: Enrichment API Update

### 4A. Update `contact-enrich` edge function

Add to enrichment response:
- `ai_summary`
- `ai_tags`
- `ai_pain_points`
- `ai_recommendations`
- `ai_risk_flags`
- Set `ai_last_enriched_at` on save

### 4B. Add 30-day skip logic

If `ai_last_enriched_at` is within 30 days and `force` is not true, return cached data.

## Files Changed

| File | Change |
|------|--------|
| **DB Migration** | Add ~25 columns to contacts, create contact_audit_log, triggers, indexes |
| `src/components/contacts/eni/ENIContactTypes.ts` | Add all new fields to ENIContact |
| `src/hooks/useContacts.ts` | Soft delete, restore, updated_by, new fields in interface |
| `src/hooks/useSmartContacts.ts` | deleted_at filter, lead_status filter |
| `src/hooks/useContactAuditLog.ts` | **New** — audit log hook |
| `src/hooks/useContactScores.ts` | **New** — scores hook |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Add scores card, lifecycle, prefs, audit tab, follow-up |
| `src/components/contacts/eni/sections/ContactScoresCard.tsx` | **New** — ICP/engagement/PARE display |
| `src/components/contacts/eni/sections/ContactLifecycleSection.tsx` | **New** — lead status pipeline |
| `src/components/contacts/eni/sections/ContactPreferencesSection.tsx` | **New** — channel preferences + consent |
| `src/components/contacts/eni/sections/ContactAuditSection.tsx` | **New** — audit log table |
| `src/components/contacts/SmartContactsTable.tsx` | Add lead_status, scores columns + filters |
| `src/components/contacts/CreateContactDialog.tsx` | Add first_name/last_name, lead_status |
| `src/components/entity/EntitySidebarMenu.tsx` | Add "Audit" menu item (admin-only) |
| `supabase/functions/contact-enrich/index.ts` | Add AI fields to enrichment response |

## What Is NOT Changed (Already Exists)

- Company association (`company_id` FK) — already exists
- Social media fields — already exist
- Location fields — already exist
- Activity logs — global trigger already in place
- Tasks association — already exists via `EntityTasksSection`
- Notes — already exists via `NotesSection`
- Deals/Opportunities — already exists via `EntityOpportunitiesSection`

## What Is Stubbed

- `pare_score` computation — manual input only, automated calculation deferred
- Bulk CSV import — existing import wizard handles it, no new endpoint needed
- `segments` — field created but UI for segment management deferred
- Full-text search index — created, but advanced search UI (searching emails jsonb) deferred to next iteration

