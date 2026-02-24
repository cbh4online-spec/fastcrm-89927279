

# FastCRM 2.0 -- AI-Native Revenue CRM Platform

## Analysis

The current codebase has ~15 navigation groups, ~80+ pages, and a module-gated marketplace system that already controls sidebar visibility via `moduleSlug`. The transformation requires reorganizing everything around 8 core navigation items while preserving all existing functionality behind marketplace extensions.

**What exists and can be reused:**
- `useWorkspaceModules` + `marketplace_modules` + `workspace_modules` (module gating works)
- `SAMPLE_MODULES` in `src/types/marketplace.ts` (27+ modules defined)
- Sidebar already filters by `installedModuleIds` and `moduleSlug`
- Revenue forecast (`useRevenueForecast`), deal scoring, AI suggestions all exist
- Onboarding system (`useIntelligentOnboarding`) exists but needs redesign

**What changes:**
- Sidebar collapses from ~15 groups to 8 flat items
- All current "sections" become Objects or Extensions
- AI features merge into single Intelligence hub
- Dashboard becomes revenue-focused
- Onboarding becomes conversational

---

## Implementation Strategy

Due to the massive scope, this will be implemented in **4 sub-phases** across multiple messages. Each sub-phase is independently deployable without breaking existing functionality.

---

## Sub-Phase A: New Sidebar + Core Navigation Shell (This message)

### 1. New Sidebar (`Sidebar.tsx` rewrite)

Replace the current 15-group collapsible sidebar with 8 flat items:

```
Home          /dashboard
Objects       /dashboard/objects
Inbox         /dashboard/inbox
Automations   /dashboard/automations
Intelligence  /dashboard/intelligence
Reports       /dashboard/reports
Marketplace   /dashboard/marketplace
Settings      /dashboard/settings
```

- Remove all collapsible groups
- Dark minimal design (keep current gradient)
- Active route highlighting
- No sub-items in sidebar -- sub-navigation handled within pages
- Keep WorkspaceSwitcher and PlanBadge

### 2. Objects Hub Page

**New file:** `src/pages/ObjectsPage.tsx`
**Route:** `/dashboard/objects`

- Tab-based view: Contacts | Companies | Deals (default objects)
- Each tab renders the existing table component (`SmartContactsTable`, `SmartLeadsTable` renamed to Deals context, Companies list)
- "Views" dropdown for saved filters
- Search bar with advanced filters
- Extension objects appear as additional tabs when installed

### 3. Intelligence Hub Page

**New file:** `src/pages/IntelligencePage.tsx`
**Route:** `/dashboard/intelligence`

- Three sections as tabs: **Assist** | **Analyze** | **Automate**
- **Assist**: Embeds existing Copilot/AI Assistant chat
- **Analyze**: Revenue forecast widget, deal scoring, pipeline health
- **Automate**: AI-suggested automations, automation generator
- Pulls from existing hooks: `useRevenueForecast`, `useGenerateAutomation`, AI suggestions

### 4. Revenue Dashboard (Home redesign)

**Edit:** `src/pages/Dashboard.tsx`

- Hero section: Revenue Forecast (expected/best/worst case)
- Pipeline Health Score card
- Deals at Risk list (low confidence opportunities)
- AI Action Suggestions (from existing `ai-suggestions`)
- Keep period filter and quick-create dropdown
- Remove detailed leads/tasks lists (move to Objects)

### 5. Route Compatibility

All existing routes (`/dashboard/leads`, `/dashboard/contacts`, etc.) remain functional via redirects or direct access. The new sidebar simply doesn't show them -- they're accessed through Objects or Extensions.

**Add redirects in `App.tsx`:**
- `/dashboard/leads` -> still works (accessed via Objects > Deals)
- `/dashboard/contacts` -> still works (accessed via Objects > Contacts)
- `/dashboard/companies` -> still works (accessed via Objects > Companies)

---

## Sub-Phase B: Object-Based Architecture (Next message)

- Custom Objects framework (database schema + CRUD)
- Custom Fields engine (already partially exists via `custom_fields`)
- Relationship Fields between objects
- Saved Views with filters
- Unified Timeline across objects

---

## Sub-Phase C: Marketplace Extension Conversion (Following message)

Convert these to marketplace extensions (add `moduleSlug` gating):
- Proposals, Invoices, B2B Portal, Orders, Education, Credit, Commerce, C2C, FastClub, Advanced Intelligence

Each extension when installed adds:
- New object types to the Objects page
- New automation templates
- New Intelligence capabilities
- **No new sidebar items** (consistent UX)

---

## Sub-Phase D: Conversational Onboarding + Monetization (Final message)

- Redesign onboarding as conversational flow
- Auto-configure objects, pipeline, fields, automations
- Extension packs (B2B Revenue, Proposals, Finance, Education, Commerce)
- Plan-based feature gating

---

## Files for Sub-Phase A

### Create

| File | Description |
|---|---|
| `src/pages/ObjectsPage.tsx` | Objects hub with Contacts/Companies/Deals tabs |
| `src/pages/IntelligencePage.tsx` | Unified Intelligence hub (Assist/Analyze/Automate) |
| `src/components/objects/ObjectsTabView.tsx` | Tab container for object types |
| `src/components/intelligence/AssistTab.tsx` | Copilot/chat interface |
| `src/components/intelligence/AnalyzeTab.tsx` | Revenue forecast + scoring |
| `src/components/intelligence/AutomateTab.tsx` | AI automation suggestions |
| `src/components/dashboard/RevenueHero.tsx` | Revenue forecast hero widget |
| `src/components/dashboard/PipelineHealthCard.tsx` | Pipeline health score |
| `src/components/dashboard/DealsAtRiskList.tsx` | At-risk deals list |
| `src/components/dashboard/AIActionSuggestions.tsx` | AI-suggested next actions |

### Edit

| File | Change |
|---|---|
| `src/components/layout/Sidebar.tsx` | Complete rewrite: 8 flat items, minimal design |
| `src/pages/Dashboard.tsx` | Redesign for revenue focus |
| `src/App.tsx` | Add `/dashboard/objects` and `/dashboard/intelligence` routes |

### Compatibility

- All existing routes remain functional
- Existing pages remain accessible via direct URL
- Module gating continues to work via `useWorkspaceModules`
- No database changes needed for Sub-Phase A

