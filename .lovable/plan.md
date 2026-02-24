

# Rollout Dashboard — Feature Flag Adoption & Bulk Toggle

## Current State

- **`workspace_feature_flags`** table exists with columns: `id`, `workspace_id`, `flag_key`, `enabled`, `created_at`
- **`useAllWorkspaces`** hook fetches all workspaces with subscriptions/usage
- **`FeatureFlagsSettings`** component defines 5 known flags in `FLAG_META` (shell_v2, nav_v2, marketplace, objects, intelligence)
- **`useFeatureFlags`** hook is workspace-scoped (current workspace only) — not usable for cross-workspace super admin view
- **SuperAdmin sidebar** has a "Sistema" section — the rollout dashboard fits here as a new nav item
- **No RLS bypass needed** — the `workspace_feature_flags` table likely has super admin read/write policies already (via `is_super_admin`)

## Plan

### 1. Hook: `useAllFeatureFlags` (Super Admin scope)

**New file: `src/hooks/useAllFeatureFlags.ts`**

Fetches ALL rows from `workspace_feature_flags` (no workspace filter). Returns:
- Raw flags data
- Computed adoption stats per flag key: `{ flagKey, enabledCount, totalWorkspaces, percentage }`
- A `bulkToggle` mutation that upserts a flag for multiple workspace IDs at once

```text
useAllFeatureFlags()
├── allFlags: { workspace_id, flag_key, enabled }[]
├── adoptionByFlag: Map<string, { enabled: number, disabled: number, noRecord: number, rate: number }>
├── bulkToggle.mutate({ flagKey, workspaceIds, enabled })
└── isLoading
```

The bulk toggle will use `supabase.from("workspace_feature_flags").upsert()` with an array of rows, leveraging the unique constraint on `(workspace_id, flag_key)`.

### 2. Component: `RolloutDashboardSection`

**New file: `src/components/super-admin/RolloutDashboardSection.tsx`**

Layout:
- **Header**: "Rollout Dashboard" title + description
- **Summary cards row**: One card per flag showing adoption rate (progress bar), enabled/total counts, and flag label
- **Flag detail table**: For the selected flag, shows every workspace as a row with:
  - Workspace name
  - Plan badge
  - Status (enabled / disabled / not set)
  - Toggle switch
- **Bulk actions bar**: Checkbox "select all" + buttons: "Enable Selected", "Disable Selected"
- **Canary release helper**: A small section with presets — "Enable for 10%", "Enable for 25%", "Enable for 50%", "Enable for all" — which randomly selects the appropriate number of workspaces and bulk-toggles

Key interactions:
- Click a flag card → filters the table to that flag
- Select workspaces via checkboxes → bulk enable/disable
- Canary buttons → confirm dialog → bulk toggle random subset

### 3. Wire into Super Admin

**Edit: `src/components/super-admin/SuperAdminSidebar.tsx`**

Add `{ id: "rollout", label: "Rollout", icon: FlaskConical }` to the "Sistema" section items.

**Edit: `src/pages/SuperAdmin.tsx`**

Add case `"rollout"` → `<RolloutDashboardSection />` to `renderContent()`.

**Edit: `src/components/super-admin/index.ts`**

Export `RolloutDashboardSection`.

## Files Summary

| File | Action |
|---|---|
| `src/hooks/useAllFeatureFlags.ts` | Create — fetch all flags + adoption stats + bulk toggle mutation |
| `src/components/super-admin/RolloutDashboardSection.tsx` | Create — full rollout dashboard UI |
| `src/components/super-admin/SuperAdminSidebar.tsx` | Edit — add "Rollout" nav item |
| `src/pages/SuperAdmin.tsx` | Edit — add rollout case to renderContent |
| `src/components/super-admin/index.ts` | Edit — export new component |

## Technical Notes

- The `FLAG_META` constant from `FeatureFlagsSettings` will be extracted into a shared `src/config/featureFlags.ts` file (or duplicated in the rollout component for simplicity — duplicating is fine since it's just 5 labels)
- Bulk upsert uses `supabase.from("workspace_feature_flags").upsert([...rows], { onConflict: "workspace_id,flag_key" })` — requires the existing unique constraint
- Canary percentages use `Math.ceil(totalWorkspaces * percentage)` and shuffle workspace IDs to pick random subset
- No new database tables or migrations needed

