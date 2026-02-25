

# Audit: Installed Modules Not Appearing in Menu

## Findings

### Database State (workspace d9e3d0ae)
10 modules installed with `active` status:

| # | Module Slug | Has Sidebar Entry | Issue |
|---|------------|-------------------|-------|
| 1 | proposals | Yes | None |
| 2 | invoices | Yes | None |
| 3 | b2b-portal | Yes | None |
| 4 | online-store | Yes | **Duplicates** with static "Loja" nav section |
| 5 | student-journey | Yes | None |
| 6 | credit-intermediation | Yes | None |
| 7 | marketplace-c2c | Yes | None |
| 8 | lead-enricher | **No** | Only has `intelligenceCapabilities`, no `objectTabs` |
| 9 | prospecting-pro | **No** | Only has `intelligenceCapabilities`, no `objectTabs` |
| 10 | seo-growth | **No** | Only has `intelligenceCapabilities`, no `objectTabs`. **Also duplicates** static "SEO" nav item |

### Root Causes

1. **3 modules have no `objectTabs`** in `extensionRegistry.ts` (lead-enricher, prospecting-pro, seo-growth). The sidebar only renders modules with `objectTabs` that have a `route`. These modules only define `intelligenceCapabilities` so they never appear.

2. **Static nav duplicates**: The `nav.v1.ts` has a hardcoded "Loja" section (Produtos, Encomendas, Categorias) and "SEO" that overlap with extension modules online-store and seo-growth, causing confusion and potential duplicates.

3. **No category grouping**: All extensions appear in a single flat "Extensoes" section, making it hard to find modules.

## Fix Plan

### 1. Add `objectTabs` for the 3 missing modules (`extensionRegistry.ts`)

Add route-based tabs for the modules that currently only have intelligence capabilities:

- `lead-enricher` → route `/dashboard/lead-enricher`, label "Lead Enricher", icon Search
- `prospecting-pro` → route `/dashboard/prospecting/professionals`, label "Prospecção Pro", icon Search
- `seo-growth` → route `/dashboard/seo`, label "SEO & Growth", icon BarChart3

### 2. Add category field to extension definitions (`extensionRegistry.ts`)

Add a `category` string to `ExtensionDefinition` and assign categories:

| Category | Modules |
|----------|---------|
| Vendas | proposals, invoices, credit-intermediation |
| Comércio | online-store, marketplace-c2c |
| Prospecção | lead-enricher, prospecting-pro, google-local-services |
| Marketing | seo-growth, bio-os, instagram-looter |
| Educação | student-journey |
| Portal | b2b-portal |
| Comunidade | fastclub |

### 3. Remove static nav items that overlap with extensions (`nav.v1.ts`)

Remove the following static items that should only appear when their module is installed:
- **Loja section** (Produtos, Encomendas, Categorias) — covered by online-store extension
- **SEO** item — covered by seo-growth extension

### 4. Update sidebar to group extensions by category (`SidebarV1.tsx`)

Replace the flat "Extensoes" section with grouped sections using each category as a label header. Extensions are grouped by category, each with a small label separator.

```text
─── Vendas ───
  Proposals
  Invoices
  Credit
─── Comércio ───
  Store Orders
  Products
  C2C Listings
─── Prospecção ───
  Lead Enricher
  Prospecção Pro
─── Marketing ───
  SEO & Growth
─── Educação ───
  Students
─── Portal ───
  Orders (B2B)
```

### 5. Update `getExtensionObjectTabs` to also return category

Export a new helper `getExtensionObjectTabsGrouped` that returns tabs organized by category for the sidebar rendering.

## Files Changed

| File | Change |
|------|--------|
| `src/config/extensionRegistry.ts` | Add `category` to `ExtensionDefinition`; add `objectTabs` for lead-enricher, prospecting-pro, seo-growth; add `getExtensionObjectTabsGrouped` helper |
| `src/config/nav.v1.ts` | Remove Loja section (Produtos, Encomendas, Categorias) and SEO — these are now dynamic via extensions |
| `src/components/layout/SidebarV1.tsx` | Use `getExtensionObjectTabsGrouped` to render extensions organized by category with label headers |
| `src/components/layout/Sidebar.tsx` | Same category grouping for V2 sidebar consistency |

