

# Conditional Shell V1/V2 based on Feature Flag

## Current State

- `DashboardLayout.tsx` always renders the single `Sidebar` component (which uses `NAV_V2_ITEMS` — 8 items)
- There is **no V1 sidebar component** — only the V2 sidebar exists
- `routes.legacy.ts` defines ~50 legacy routes that were the original navigation
- `useFeatureFlag("ui.shell_v2_enabled")` hook exists and reads from `workspace_feature_flags`
- The feature flag key used in `FeatureFlagsSettings.tsx` is `"ui.shell_v2_enabled"`

## Plan

### 1. Create V1 nav config: `src/config/nav.v1.ts`

Define the legacy sidebar navigation items (the "classic" CRM sidebar) with icons. This is the original navigation with all the traditional CRM sections visible — roughly 15–20 items grouped by category (CRM, Store, Marketing, Tools, Settings). Each item has `name`, `href`, `icon`, and optionally `group` for section headers.

### 2. Create V1 Sidebar: `src/components/layout/SidebarV1.tsx`

A traditional full-nav sidebar with grouped sections. Same shell chrome as the current sidebar (workspace logo, workspace switcher, plan badge, role indicator) but with the V1 nav items organized by group headers (e.g., "CRM", "Loja", "Marketing", "Ferramentas"). Same `open`/`onClose` props interface so it's a drop-in replacement.

### 3. Edit `DashboardLayout.tsx`

- Import `useFeatureFlag` from `@/hooks/useFeatureFlags`
- Import both `Sidebar` (V2) and `SidebarV1`
- Call `useFeatureFlag("ui.shell_v2_enabled")`
- Conditionally render `<Sidebar />` or `<SidebarV1 />` based on the flag
- While the flag is loading, show the V1 sidebar as default (safe fallback)

```text
DashboardLayout
├── useFeatureFlag("ui.shell_v2_enabled")
├── if shellV2 → <Sidebar /> (current V2)
└── else      → <SidebarV1 /> (legacy nav)
```

### Files Summary

| File | Action |
|---|---|
| `src/config/nav.v1.ts` | **Create** — legacy nav items with groups and icons |
| `src/components/layout/SidebarV1.tsx` | **Create** — classic sidebar with grouped navigation |
| `src/components/layout/DashboardLayout.tsx` | **Edit** — conditionally render V1 or V2 sidebar based on feature flag |

### Technical Details

- Both sidebars share the same props interface (`open: boolean`, `onClose: () => void`) so the layout doesn't change
- Both use `w-64` fixed width and `lg:pl-64` offset, so no layout shift between versions
- The V1 sidebar reuses existing shared components: `WorkspaceSwitcher`, `WorkspaceLogo`, `PlanBadge`
- `useFeatureFlag` returns `{ enabled, isLoading }` — during loading we default to V1 (the legacy experience) to avoid flash
- V1 nav groups: **CRM** (Leads, Contacts, Companies, Opportunities, Tasks), **Loja** (Products, Orders, Categories), **Marketing** (Marketing, SEO), **Ferramentas** (Automations, AI Assistants, Form Studio), **Settings**

