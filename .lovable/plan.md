

# Fix: Installed Modules Not Appearing in V1 Sidebar

## Problem

The V1 sidebar (`SidebarV1.tsx`) only renders static items from `nav.v1.ts` plus custom objects from `useCustomObjects`. It has **no integration with the extension registry** -- unlike the V2 sidebar (`Sidebar.tsx`), which calls `getExtensionObjectTabs(installedModuleIds)` to dynamically add installed module links.

Since the workspace uses V1 (no `ui.shell_v2_enabled` flag), installed modules like Proposals, Invoices, Student Journey, etc. never appear in the menu.

## Fix

Add the same extension-based dynamic nav items to `SidebarV1.tsx`:

1. Import `useWorkspaceModules` and `getExtensionObjectTabs` from the extension registry
2. Compute `extensionNavItems` from installed module IDs (same logic as V2 sidebar)
3. Render an "Extensoes" section at the bottom of the nav list with the extension items

## Files Changed

| File | Change |
|------|--------|
| `src/components/layout/SidebarV1.tsx` | Import `useWorkspaceModules` + `getExtensionObjectTabs`; compute extension nav items; render them in an "Extensoes" section after the main nav items |

## Technical Detail

The V2 sidebar already does this correctly (lines 54-56 of `Sidebar.tsx`):

```typescript
const extensionNavItems = useMemo(() => {
  return getExtensionObjectTabs(installedModuleIds).filter((tab) => tab.route);
}, [installedModuleIds]);
```

The same pattern will be replicated in `SidebarV1.tsx`, rendering extension items with a `Puzzle` icon separator label and supporting both collapsed and expanded states.

