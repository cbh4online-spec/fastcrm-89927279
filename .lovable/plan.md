

# Plan: Seed Glossary Terms (Phase 2 - Task t2-3)

## Context

The glossary pages (list at `/glossary` + detail at `/glossary/:slug`) are fully implemented in code with alphabet navigation, definition cards, content sections, examples, and related terms. However, the `seo_entities` table has **zero glossary records**, so both pages render empty.

## Approach

Insert **25 core CRM/SEO/Marketing glossary terms** as published `seo_entities` records with `entity_type = 'glossary'`. These cover the essential terms users search for when learning about CRM, sales, and digital marketing.

## Glossary Terms

| # | Slug | Title |
|---|------|-------|
| 1 | `crm` | CRM (Customer Relationship Management) |
| 2 | `lead` | Lead |
| 3 | `funil-de-vendas` | Funil de Vendas |
| 4 | `pipeline` | Pipeline |
| 5 | `roi` | ROI (Retorno sobre Investimento) |
| 6 | `cac` | CAC (Custo de Aquisição de Cliente) |
| 7 | `ltv` | LTV (Lifetime Value) |
| 8 | `churn` | Churn Rate |
| 9 | `seo` | SEO (Search Engine Optimization) |
| 10 | `keyword-research` | Keyword Research |
| 11 | `long-tail-keywords` | Long-Tail Keywords |
| 12 | `taxa-de-conversao` | Taxa de Conversão |
| 13 | `inbound-marketing` | Inbound Marketing |
| 14 | `outbound-marketing` | Outbound Marketing |
| 15 | `lead-scoring` | Lead Scoring |
| 16 | `automacao-de-marketing` | Automação de Marketing |
| 17 | `kpi` | KPI (Key Performance Indicator) |
| 18 | `bounce-rate` | Bounce Rate |
| 19 | `ctr` | CTR (Click-Through Rate) |
| 20 | `serp` | SERP (Search Engine Results Page) |
| 21 | `backlink` | Backlink |
| 22 | `domain-authority` | Domain Authority |
| 23 | `landing-page` | Landing Page |
| 24 | `call-to-action` | Call to Action (CTA) |
| 25 | `persona` | Persona (Buyer Persona) |

Each term will include:
- Title, h1, meta_description, tldr (definition)
- 2-3 content sections (explanation, importance, how to use)
- 1-2 practical examples
- A CTA pointing to `/tools/keyword-ideas`
- Status: `published`, language: `pt`, intent: `informational`

## Implementation Steps

### 1. Database Migration — INSERT

Single SQL migration inserting 25 glossary records into `seo_entities` with `workspace_id = NULL`, `entity_type = 'glossary'`, and rich JSONB content.

### 2. Update Roadmap — EDIT `src/modules/growth-seo/config/seoRoadmap.ts`

Change task `t2-3` status from `'todo'` to `'done'`.

## No New Files or Dependencies

All changes use existing infrastructure. The `GlossaryListPage` groups by letter automatically, and `GlossaryTermPage` renders definitions, content sections, examples, CTAs, and related terms from the database record.

## Technical Notes

- Records use `workspace_id = NULL` for public RLS access
- The `tldr` field serves as the definition shown in the prominent definition card
- The alphabet navigation in the list page will auto-populate based on the first letter of each term
- Related terms are fetched automatically by the `RelatedContent` component
- View counts start at 0 and increment on page visit

