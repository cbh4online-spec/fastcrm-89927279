

# Marketplace 2.0 Extension System — Full Stack Implementation

## Current State Assessment

The system has solid infrastructure already in place:
- **Database:** `marketplace_modules` (with `manifest_json`), `workspace_modules`, `workspace_feature_flags`, `extension_audit_logs` all exist
- **Edge Function:** `extension-provisioner` handles enable/disable with feature flag toggling and audit logging
- **Frontend:** `useWorkspaceModules`, `useExtensionManifests`, `useFeatureFlags` hooks all functional; `ObjectsHomePage` renders extension objects from manifests; `Marketplace.tsx` has install/uninstall with manifest-driven module cards

## Gaps Identified

### A. Database Schema Gaps
1. **`CreateObjectWizard` is UI-only** — it calls `onComplete` with a toast but never inserts into `core_object_types` or `core_object_fields`. Custom objects created by users are lost on refresh.
2. **No `extension_installed_objects` tracking** — when the provisioner enables a module with manifest objects, it doesn't record which objects were provisioned (makes cleanup on disable impossible).
3. **`core_object_types` missing `source_module` column** — no way to distinguish user-created custom objects from extension-provisioned ones.

### B. Provisioner Enhancements
1. **No manifest-driven provisioning** — the provisioner reads `manifest_json` and extracts `feature_flags`, but ignores `objects`, `fields`, and `views`. When you enable an extension with objects in its manifest, those objects should be auto-created in `core_object_types` and `core_object_fields`.
2. **No cleanup on disable** — when disabling, the provisioner should mark extension-provisioned objects as inactive (not delete them, to preserve data).

### C. Dynamic UI from Manifests
1. **Sidebar doesn't show extension items** — installed extensions with routes (from `extensionRegistry.ts`) don't appear in the sidebar. The sidebar only renders hardcoded `NAV_V2_ITEMS`.
2. **`extensionSettingsPages` from manifests are computed but never rendered** — no component consumes them.
3. **`CreateObjectWizard` doesn't persist** — needs to actually insert into `core_object_types` and `core_object_fields`.

---

## Implementation Plan

### 1. Database Migration

Add `source_module` column to `core_object_types` to track which extension provisioned each object:

```sql
ALTER TABLE public.core_object_types 
  ADD COLUMN IF NOT EXISTS source_module text DEFAULT NULL;

ALTER TABLE public.core_object_types 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

COMMENT ON COLUMN public.core_object_types.source_module IS 
  'Module slug that provisioned this object type. NULL = user-created.';
```

### 2. Enhanced Extension Provisioner

Update `supabase/functions/extension-provisioner/index.ts`:

**On enable:**
- After inserting `workspace_modules` and feature flags (existing logic)
- Read `manifest.objects[]` and for each, upsert into `core_object_types` with `source_module = module_slug`
- Read `manifest.fields[]` and for each, upsert into `core_object_fields` linked to the provisioned object type
- Read `manifest.views[]` and upsert into `core_object_views`

**On disable:**
- Set `is_active = false` on `core_object_types` WHERE `source_module = module_slug` (don't delete — preserve data)
- Existing feature flag disable logic stays

### 3. CreateObjectWizard — Persist to Database

Update `src/components/objects/CreateObjectWizard.tsx` to actually insert the custom object into `core_object_types` and its fields into `core_object_fields` using the workspace context.

### 4. Sidebar Dynamic Extension Items

Update `src/components/layout/Sidebar.tsx`:
- Import `useWorkspaceModules` and the extension registry
- After rendering `navItems`, render a "Extensions" separator followed by installed extension items that have routes
- Only show items for modules that are currently installed

### 5. Extension Settings Pages Renderer

Create `src/components/settings/ExtensionSettingsSection.tsx`:
- Consumes `extensionSettingsPages` from `useExtensionManifests`
- Renders a list of settings page links within the Settings page
- Each links to the route defined in the manifest

### 6. ObjectsHomePage — Filter Inactive

Update `src/pages/ObjectsHomePage.tsx` to respect the `is_active` flag on extension objects, hiding disabled extension objects from the grid.

---

## Files to Create

| File | Purpose |
|---|---|
| `src/components/settings/ExtensionSettingsSection.tsx` | Render manifest-driven settings pages |

## Files to Edit

| File | Change |
|---|---|
| `supabase/functions/extension-provisioner/index.ts` | Add manifest object/field/view provisioning on enable; soft-disable on disable |
| `src/components/objects/CreateObjectWizard.tsx` | Persist to `core_object_types` + `core_object_fields` |
| `src/components/layout/Sidebar.tsx` | Add dynamic extension nav items from registry |
| `src/pages/ObjectsHomePage.tsx` | Filter inactive extension objects |
| `src/pages/Settings.tsx` | Include `ExtensionSettingsSection` |

## Migration

One migration adding `source_module` and `is_active` columns to `core_object_types`.

