

# FastCRM Architecture Review & Improvement Plan

## Current State Assessment

### What works well
- **Domain-organized components** — grouped by module (crm, invoices, procurement, etc.)
- **Design system foundation** — tokens, shared components, conventions documented
- **i18n infrastructure** — 4 languages with proper namespace separation
- **Feature flags** — `useFeatureFlags` for progressive rollout
- **Module pattern started** — `growth-seo` and `credit-intermediation` use proper module boundaries

### Critical issues

#### 1. Monolithic App.tsx (968 lines, ~300 imports)
The single `App.tsx` eagerly imports every page in the application. This means the **entire app is bundled into one chunk** — every user downloads all 200+ pages on first load, including Security Ops, Student Journey, Procurement, C2C Marketplace, etc., even if they never visit those modules.

#### 2. No code splitting or lazy loading
Zero usage of `React.lazy()` or dynamic `import()`. For an app of this size, this is the single biggest performance problem.

#### 3. Flat hooks directory (529+ files)
`src/hooks/` contains 500+ hooks in a single directory with no sub-organization. Finding, maintaining, and understanding dependencies between hooks is nearly impossible.

#### 4. Flat pages directory (200+ files)
Most pages sit directly in `src/pages/` with no grouping. Some modules (security, procurement, c2c) use subdirectories, but most don't.

#### 5. Inconsistent module boundaries
Only `growth-seo` and `credit-intermediation` use the proper `src/modules/` pattern with clean exports. Everything else is scattered across `components/`, `hooks/`, and `pages/` with no encapsulation.

---

## Improvement Plan

### Phase 1 — Code Splitting (highest impact, lowest risk)

Convert all route-level page imports to lazy imports with `React.lazy` and wrap route groups in `<Suspense>`. This alone can reduce initial bundle by 70-80%.

```text
Before:  import SecurityDashboardPage from "./pages/security/SecurityDashboardPage"
After:   const SecurityDashboardPage = lazy(() => import("./pages/security/SecurityDashboardPage"))
```

Split into route groups by domain:
- **Core CRM** (dashboard, leads, contacts, companies, pipeline)
- **Sales** (invoices, proposals, products, packages)
- **Communication** (inbox, templates, sequences)
- **AI modules** (agents, employees, copilot, operations center)
- **Marketplace/C2C** (all c2c pages)
- **Security Ops** (all security pages)
- **Procurement** (all procurement pages)
- **Community/FastClub** (all club/community pages)
- **Store** (public e-commerce)
- **Client Portal** (B2B client area)
- **Reports** (all report pages)
- **Account Brief** (all account brief pages)
- **Student Journey** (SJ pages)
- **Checkout** (checkout funnel pages)
- **Growth/SEO** (already modularized)

### Phase 2 — Route file extraction

Move each domain's routes into dedicated files under `src/routes/`:

```text
src/routes/
├── CoreRoutes.tsx          # Dashboard, Command Center, Settings
├── CRMRoutes.tsx           # Leads, Contacts, Companies, Pipeline
├── SalesRoutes.tsx         # Invoices, Proposals, Products
├── SecurityRoutes.tsx      # All security/* pages
├── ProcurementRoutes.tsx   # All procurement/* pages
├── C2CRoutes.tsx           # All c2c/* pages
├── CommunityRoutes.tsx     # FastClub, Forum, Loyalty
├── AIRoutes.tsx            # Agents, Employees, Copilot, OCR
├── ReportsRoutes.tsx       # All report pages
├── AccountBriefRoutes.tsx  # All account brief pages
├── CheckoutRoutes.tsx      # Checkout funnel
├── StudentJourneyRoutes.tsx
└── PublicRoutes.tsx        # Landing, Bio, Public pages
```

This reduces App.tsx from 968 lines to ~80 lines.

### Phase 3 — Hooks reorganization

Move hooks into domain folders matching their module:

```text
src/hooks/
├── crm/           # useLeads, useContacts, useCompanies, usePipeline
├── invoices/      # useInvoices, useInvoiceProducts, useInvoiceSettings
├── ai/            # useAIAgents, useAIEmployees, useAISettings
├── procurement/   # useProcurement, useRFQ, useSuppliers
├── community/     # useForum, useLoyalty, useCommunityMembers
├── account-brief/ # useAccountBrief* (20+ hooks)
├── c2c/           # Already done ✓
├── security/      # Already done ✓
├── common/        # useDebounce, useMobile, useInfiniteScroll
└── kernel/        # useKernel*, useContextOS
```

Each folder gets a barrel `index.ts` for clean imports.

### Phase 4 — Module encapsulation

Migrate the largest domains into self-contained modules (following the `growth-seo` pattern):

```text
src/modules/
├── growth-seo/         # Already done ✓
├── credit-intermediation/ # Already done ✓
├── security-ops/       # pages + components + hooks + types
├── procurement/        # pages + components + hooks + types
├── c2c-marketplace/    # pages + components + hooks + types
├── account-brief/      # pages + components + hooks + types
├── student-journey/    # pages + components + hooks + types
└── checkout/           # pages + components + hooks + types
```

Each module owns its pages, components, hooks, and types with a single `index.ts` public API.

---

## Implementation priority

| Priority | Change | Impact | Risk | Effort |
|----------|--------|--------|------|--------|
| 1 | Lazy loading all pages | Major perf gain | Low | Medium |
| 2 | Route file extraction | Maintainability | Low | Medium |
| 3 | Hooks reorganization | Developer experience | Medium | High |
| 4 | Full module encapsulation | Long-term architecture | Medium | High |

### Recommendation
Start with **Phase 1 + Phase 2 together** — they complement each other and deliver the biggest wins (performance + maintainability) with the lowest risk. Phases 3-4 can be done incrementally per module.

