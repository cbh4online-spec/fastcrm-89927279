

# Companies Core Object — Evolve Existing Table

## Current State

The `companies` table already has **75 columns** covering identity, AI fields, Google Places, fiscal data, commercial history, and social media. The table is deeply integrated across the codebase (hooks, detail page with 15+ sections, list page with filters/columns, enrichment, insights).

Creating a new table would require rewriting the entire system. Instead, this plan evolves the existing table by adding the missing columns from the spec.

## Column Audit: What Exists vs What's Needed

| Spec Field | Exists As | Action |
|------------|-----------|--------|
| `name` | `name` | Already exists |
| `legal_name` | — | **Add** |
| `domain` | — | **Add** (+ unique index per workspace) |
| `description` | — | **Add** |
| `status` | `company_status` | **Rename/reuse** — backfill to `prospect`/`customer`/`partner`/`inactive` |
| `categories` | — | **Add** (`text[]`) |
| `logo_url` | `avatar_url` | Already exists as `avatar_url` |
| `founded_year` | `founding_date` | Already exists (text) — **add** `founded_year int` separately |
| `employee_range` | `size` | Already exists as `size` |
| `annual_revenue_range` | — | **Add** |
| `funding_amount` | — | **Add** |
| `business_model` | — | **Add** |
| `country` | — | **Add** (backfill from region/parish data) |
| `state` | `region` | Already exists as `region` |
| `timezone` | — | **Add** |
| `connection_strength` | — | **Add** |
| `icp_fit_score` | — | **Add** (0-100) |
| `pare_score` | — | **Add** (0-100) |
| `account_value_estimate` | — | **Add** |
| `estimated_ltv` | — | **Add** |
| `primary_use_case` | — | **Add** |
| `decision_maker_role` | — | **Add** |
| `priority_level` | — | **Add** (default `medium`) |
| `ai_summary` | — | **Add** |
| `ai_tags` | — | **Add** (jsonb `[]`) |
| `ai_pain_points` | — | **Add** (jsonb `{}`) |
| `ai_opportunities` | — | **Add** (jsonb `{}`) |
| `ai_risk_flags` | — | **Add** (jsonb `{}`) |
| `ai_last_enriched_at` | `ai_analyzed_at` | Already exists — **add alias** |
| `custom_fields` | — | **Add** (jsonb `{}`) |
| `updated_by` | — | **Add** |
| `deleted_at` | — | **Add** (soft delete) |
| `associated_workspaces` | — | **Add** (uuid[] `{}`) |

**Total: ~22 new columns to add**

## Phase 1: Database Migration

### 1A. Add missing columns

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  legal_name text,
  domain text,
  description text,
  categories text[] DEFAULT '{}',
  founded_year int,
  annual_revenue_range text,
  funding_amount numeric,
  business_model text,
  country text,
  timezone text,
  connection_strength text DEFAULT 'neutral',
  icp_fit_score int NOT NULL DEFAULT 0,
  pare_score int NOT NULL DEFAULT 0,
  account_value_estimate numeric,
  estimated_ltv numeric,
  primary_use_case text,
  decision_maker_role text,
  priority_level text DEFAULT 'medium',
  ai_summary text,
  ai_tags jsonb DEFAULT '[]'::jsonb,
  ai_pain_points jsonb DEFAULT '{}'::jsonb,
  ai_opportunities jsonb DEFAULT '{}'::jsonb,
  ai_risk_flags jsonb DEFAULT '{}'::jsonb,
  ai_last_enriched_at timestamptz,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  associated_workspaces uuid[] DEFAULT '{}',
  updated_by uuid,
  deleted_at timestamptz;
```

### 1B. Data backfill

- Extract `domain` from `website` (strip protocol/www/path)
- Copy `ai_analyzed_at` → `ai_last_enriched_at`
- Map `company_status` → normalize to `prospect`/`customer`/`partner`/`inactive`
- Extract `founded_year` from `founding_date` text field

### 1C. Create `companies_audit_log` table

Same pattern as `contact_audit_log`:
- id, workspace_id, company_id (FK cascade), changed_by, changed_at, field_name, old_value, new_value
- RLS: workspace members can SELECT
- Indexes on workspace_id, company_id, changed_at

### 1D. Create audit trigger

Trigger on `companies` UPDATE that writes per-field changes to `companies_audit_log` for key fields (name, legal_name, domain, industry, status, icp_fit_score, pare_score, etc.) and auto-sets `updated_at = now()`.

### 1E. Score validation trigger

Clamp `icp_fit_score` and `pare_score` to 0-100 on INSERT/UPDATE.

### 1F. Indexes

- UNIQUE on `(workspace_id, lower(domain)) WHERE domain IS NOT NULL`
- GIN on `categories`, `ai_tags`, `custom_fields`
- Index on `(workspace_id, company_status)` for status filtering
- Index on `(workspace_id, deleted_at)` for soft delete
- Full-text index on `(name, description, industry)`

## Phase 2: Update Hooks & Types

### 2A. Update `Company` interface in `useCompanies.ts`

Add all 22 new fields to the `Company` interface and `CreateCompanyData`.

### 2B. Soft delete + restore

- Change `deleteCompany` from hard delete to `UPDATE ... SET deleted_at = now()`
- Add `restoreCompany` mutation
- Add `.is("deleted_at", null)` filter to all queries

### 2C. Set `updated_by` on updates

Pass `user.id` as `updated_by` on every update mutation.

### 2D. Create `useCompanyAuditLog` hook

Same pattern as `useContactAuditLog` — fetch from `companies_audit_log` ordered by `changed_at DESC`.

### 2E. Create `useCompanyScores` hook

For updating `icp_fit_score` and `pare_score` with toast feedback.

## Phase 3: UI Updates

### 3A. New section components

| Component | Purpose |
|-----------|---------|
| `CompanyScoresCard.tsx` | ICP + PARE score display with inline edit |
| `CompanyLifecycleSection.tsx` | Status pipeline (prospect → customer → partner → inactive) |
| `CompanyFirmographicsSection.tsx` | founded_year, employee_range, revenue_range, funding, business_model |
| `CompanyAuditSection.tsx` | Audit log table (admin-only) |

### 3B. Update `CompanyDetailWithSidebar.tsx`

- Add Scores + Lifecycle cards to Overview section
- Add Firmographics section to Details tab
- Add `audit` case to `renderSectionContent` for the audit tab
- Add domain display with "verified" badge potential

### 3C. Update `EntitySidebarMenu.tsx`

Add `audit` menu item for `company` entity type (already added for `contact`, extend `showFor`).

### 3D. Update `SmartCompaniesTable.tsx`

Add new columns:
- `company_status` (with colored badge)
- `icp_fit_score`, `pare_score` (score bars)
- `domain` (link)
- `priority_level` (badge)
- `categories` (tag chips)

### 3E. Soft delete UX

- Replace hard delete with soft delete
- Show toast "Empresa arquivada" with undo option
- Add "Archived" filter toggle

### 3F. Update `CreateCompanyDialog`

Add `domain` field that auto-extracts from website input.

## Phase 4: Domain Auto-Link

When a contact is created with an email like `user@company.com`, check if any company in the workspace has `domain = 'company.com'`. If so, auto-set `company_id` on the contact.

This logic will be added to the contact creation flow in `useContacts.ts`.

## Files Changed

| File | Change |
|------|--------|
| **DB Migration** | Add ~22 columns, create companies_audit_log, triggers, indexes |
| `src/hooks/useCompanies.ts` | Add new fields to Company/CreateCompanyData, soft delete, restore, updated_by, deleted_at filter |
| `src/hooks/useCompanyAuditLog.ts` | **New** — audit log hook |
| `src/hooks/useCompanyScores.ts` | **New** — ICP/PARE scores hook |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Add scores, lifecycle, firmographics, audit sections |
| `src/components/companies/sections/CompanyScoresCard.tsx` | **New** — ICP + PARE display |
| `src/components/companies/sections/CompanyLifecycleSection.tsx` | **New** — status pipeline |
| `src/components/companies/sections/CompanyFirmographicsSection.tsx` | **New** — firmographic details |
| `src/components/companies/sections/CompanyAuditSection.tsx` | **New** — audit log table |
| `src/components/companies/SmartCompaniesTable.tsx` | Add status, scores, domain, priority columns |
| `src/components/companies/CreateCompanyDialog.tsx` | Add domain field |
| `src/components/entity/EntitySidebarMenu.tsx` | Extend audit item showFor to include 'company' |
| `src/components/common/DynamicTableCell.tsx` | Add company_status, priority_level renderers |
| `src/types/entity.ts` | Already has 'audit' in MenuSection (done in contacts phase) |
| `src/hooks/useContacts.ts` | Add domain auto-link logic on contact create |

## What Already Exists (No Changes Needed)

- Social media fields (linkedin, facebook, instagram, twitter)
- Google Places integration (rating, reviews, maps)
- AI temperature, score, insights, next action
- Commercial history (sales by year, revenue, ticket)
- Financial (payment conditions, credit)
- CAE/fiscal data
- Activity profiles
- Company contacts, deals, tasks, proposals, timeline sections

## What Is Stubbed

- `icp_fit_score` computation — manual only, automated scoring deferred
- `pare_score` — manual initially
- Domain verification via email flow — deferred
- Enrichment quota per workspace — field created but enforcement deferred
- `associated_workspaces` — field created but multi-workspace UI deferred

