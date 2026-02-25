

# Plan: Create /compare/* High-Intent Pages (Phase 2 - Task t2-4)

## Context

The `ComparePage` component, `ComparisonTable`, routing (`/compare/:slug`), hooks, and `seo_comparisons` table all exist but the table has **zero records**. The comparison page renders a feature table, conclusion, keyword generator widget, FAQs, and sticky CTA -- all driven by data.

The `seo_comparisons` table references `entity_a_id` and `entity_b_id` from `seo_entities`, but the current `useSEOComparison` hook only does `select('*')` -- it does **not** join the referenced entities. This means `comparison.entity_a` and `comparison.entity_b` are always undefined, and column headers fall back to "Opção A" / "Opção B".

## Comparison Pages to Create

| # | Slug | Title | Competitor |
|---|------|-------|------------|
| 1 | `fastcrm-vs-semrush` | FastCRM vs Semrush | Semrush |
| 2 | `fastcrm-vs-ahrefs` | FastCRM vs Ahrefs | Ahrefs |
| 3 | `fastcrm-vs-ubersuggest` | FastCRM vs Ubersuggest | Ubersuggest |
| 4 | `fastcrm-vs-google-keyword-planner` | FastCRM vs Google Keyword Planner | Google Keyword Planner |
| 5 | `fastcrm-vs-moz` | FastCRM vs Moz | Moz |

Each comparison will include:
- Title, meta_description
- Introduction text
- 6-8 comparison criteria with winner per row
- Conclusion with overall winner
- 3-4 FAQs
- Schema markup (JSON-LD)
- Status: `published`, winner: `a` (FastCRM)

## Implementation Steps

### 1. Create Tool Entities — DATABASE INSERT

Insert 6 `seo_entities` records with `entity_type = 'tool'`:
- **FastCRM Keyword Generator** (entity A for all comparisons)
- **Semrush**, **Ahrefs**, **Ubersuggest**, **Google Keyword Planner**, **Moz** (entity B)

These are minimal records (title, slug, meta_description, status = published) to serve as foreign key references and provide display names in the comparison table headers.

### 2. Fix useSEOComparison Hook — EDIT `src/modules/growth-seo/hooks/useSEOEntity.ts`

Update the query to fetch entity_a and entity_b data alongside the comparison. Since Supabase JS client doesn't support joining arbitrary foreign keys easily with `select('*, entity_a:seo_entities!entity_a_id(*)')`, we'll do a secondary fetch: after getting the comparison, fetch entity_a and entity_b by their IDs and merge them into the result.

### 3. Insert 5 Comparisons — DATABASE INSERT

Insert 5 records into `seo_comparisons` with:
- `entity_a_id` = FastCRM tool entity ID
- `entity_b_id` = respective competitor entity ID
- Rich JSONB `content` with introduction, criteria array, conclusion, and FAQs
- `winner = 'a'`, `status = 'published'`

### 4. Add Compare List Page — NEW FILE `src/modules/growth-seo/pages/CompareListPage.tsx`

A list page at `/compare` showing all published comparisons. Uses `useSEOComparisonsList` hook (already exists). Shows cards with title, meta_description, and link to `/compare/:slug`.

### 5. Register Route — EDIT `src/App.tsx`

Add route for `/compare` list page.

### 6. Update Roadmap — EDIT `src/modules/growth-seo/config/seoRoadmap.ts`

Mark task `t2-4` as `done`.

## Technical Notes

- Comparisons use `workspace_id = NULL` for public access via RLS
- The `entity_a_id` / `entity_b_id` foreign keys reference `seo_entities` so we need the tool records to exist first
- The existing `ComparisonTable` component handles rendering criteria rows with winner indicators
- The `ComparisonConclusion` component shows the winner name from entity titles
- All comparison content is in Portuguese

