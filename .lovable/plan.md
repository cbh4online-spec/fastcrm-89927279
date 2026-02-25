

# Fix: Reports (and other modules) Missing from Sidebar

## Problem

The sidebar navigation has two versions:
- **V2 Sidebar** (`nav.v2.ts`): Has Reports, Marketplace, Intelligence — but these are gated behind feature flags that may not be enabled for the workspace.
- **V1 Sidebar** (`nav.v1.ts`): Does **not** have Reports, Marketplace, or Inbox entries at all.

The `DashboardLayout` checks the `ui.shell_v2_enabled` feature flag to decide which sidebar to render. If V1 is active (the default when no flag exists), the user will never see Reports, Marketplace, or other V2-only items.

## Fix

Add the missing nav items to `nav.v1.ts` so they appear regardless of which sidebar version is active:

| Item | Route | Group |
|------|-------|-------|
| Reports | `/dashboard/reports` | Ferramentas |
| Marketplace | `/dashboard/marketplace` | Ferramentas |
| Inbox | `/dashboard/inbox` | Geral |

## Files Changed

| File | Change |
|------|--------|
| `src/config/nav.v1.ts` | Add Reports (`BarChart3`), Marketplace (`Layers`), and Inbox (`Inbox`) nav items |

