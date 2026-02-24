

# Marketplace Interno 2.0 — Extension System MVP

## Current State Analysis

The project already has significant marketplace infrastructure:

- **`marketplace_modules`** table: Full catalog with slug, category, pricing, permissions, status
- **`workspace_modules`** table: Per-workspace install tracking with status (active/trial/canceled)
- **`useWorkspaceModules`** hook: Install/uninstall mutations + `isModuleInstalled()` check
- **`EXTENSION_REGISTRY`** (hardcoded TypeScript): Maps module slugs → object tabs, intelligence capabilities, automation templates
- **`OBJECT_REGISTRY`** (hardcoded): Core objects only (contacts, companies, deals)
- **`workspace_feature_flags`** table + `useFeatureFlags` hook: Per-workspace flag toggle
- **`Marketplace.tsx`** page: Discover/Packs/Installed tabs with cards
- **Database tables already exist**: `fastcrm_proposals`, `invoices`, `order_notes` — data layer is ready

### Gap Analysis

What's missing vs the spec:

1. **No `manifest_json`** on modules — the "contract" of what an extension provides is hardcoded in `extensionRegistry.ts`, not stored alongside the module
2. **No audit logs** for enable/disable actions
3. **No provisioning engine** — installing a module doesn't automatically set feature flags or register objects
4. **Objects page only shows core 3** — no dynamic extension objects
5. **No settings pages** contributed by extensions
6. **Extension Registry is code-only** — should be data-driven from the manifest

## Architecture Decision

Rather than creating parallel `extensions` + `workspace_extensions` tables (which duplicate `marketplace_modules` + `workspace_modules`), we'll **extend the existing tables** and add the missing pieces:

```text
┌─────────────────────────┐
│   marketplace_modules   │  ← Add manifest_json column
│   (= extensions catalog)│
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   workspace_modules     │  ← Already tracks enable/disable
│   (= workspace_ext)     │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│ extension_audit_logs    │  ← NEW table
└─────────────────────────┘
             │
┌────────────▼────────────┐
│ workspace_feature_flags │  ← Provisioning sets these
└─────────────────────────┘
```

## Plan

### 1. Database Migration — Add `manifest_json` + audit logs

**Migration SQL:**

**1a. Add `manifest_json` to `marketplace_modules`:**
```sql
ALTER TABLE public.marketplace_modules
  ADD COLUMN IF NOT EXISTS manifest_json jsonb DEFAULT '{}'::jsonb;
```

**1b. Create `extension_audit_logs`:**
```sql
CREATE TABLE public.extension_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  extension_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('enable', 'disable')),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extension_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own workspace audit logs"
  ON public.extension_audit_logs FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert audit logs"
  ON public.extension_audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE INDEX idx_extension_audit_workspace ON public.extension_audit_logs(workspace_id, created_at DESC);
```

**1c. Seed manifest_json for the 3 official extensions:**

Using the insert tool (data operations), update the `marketplace_modules` rows for `proposals`, `invoices`, and `b2b-portal` with their manifest JSON. If these slugs don't exist yet, insert them.

### 2. Create Edge Function: `extension-provisioner`

**Create: `supabase/functions/extension-provisioner/index.ts`**

Handles enable/disable with provisioning side effects:

**Enable flow:**
1. Validate JWT + workspace membership
2. Read the module's `manifest_json`
3. Upsert `workspace_modules` row with status `active`
4. For each `feature_flags` in manifest → upsert `workspace_feature_flags` with `enabled: true`
5. Insert `extension_audit_logs` record (action: `enable`)
6. Return success + manifest summary

**Disable flow:**
1. Validate JWT + workspace membership
2. Read the module's `manifest_json`
3. Update `workspace_modules` status to `canceled`
4. For each `feature_flags` in manifest → update `workspace_feature_flags` with `enabled: false`
5. Insert `extension_audit_logs` record (action: `disable`)
6. Return success

**Request:**
```json
POST { "action": "enable" | "disable", "module_slug": "proposals" }
Headers: Authorization, X-Workspace-Id
```

**Key constraint:** Data is never deleted. Disable only hides from UI.

### 3. Update `useWorkspaceModules` — Use provisioner

**Edit: `src/hooks/useWorkspaceModules.ts`**

- Change `installMutation` to call `supabase.functions.invoke("extension-provisioner", { body: { action: "enable", module_slug } })` instead of direct table inserts
- Change `uninstallMutation` to call the same function with `action: "disable"`
- This centralizes provisioning logic server-side

### 4. Create Extension Manifest Types

**Create: `src/types/extensionManifest.ts`**

```typescript
export interface ExtensionManifest {
  objects?: Array<{
    type: string;       // e.g. "proposal"
    label: string;
    labelPt: string;
    icon: string;       // Lucide icon name
    source_table: string;
    color: string;
    description: string;
  }>;
  fields?: Array<{
    object_type: string;
    key: string;
    type: "text" | "number" | "date" | "select" | "currency";
    label: string;
  }>;
  views?: Array<{
    object_type: string;
    name: string;
    filter: Record<string, unknown>;
  }>;
  automations?: Array<{
    template_key: string;
    label: string;
    description: string;
    trigger: string;
  }>;
  intelligence?: Array<{
    capability: string;
    label: string;
    description: string;
  }>;
  settings_pages?: Array<{
    key: string;
    label: string;
    route: string;
  }>;
  feature_flags?: string[];
}
```

### 5. Create `useExtensionManifests` hook

**Create: `src/hooks/useExtensionManifests.ts`**

- Fetches `marketplace_modules` with `manifest_json` for all installed module slugs
- Returns parsed manifests keyed by slug
- React Query with 5-min stale time
- Exposes helper functions:
  - `getExtensionObjects()` — all objects from installed extensions
  - `getExtensionViews(objectType)` — views for a specific object type
  - `getExtensionSettingsPages()` — all settings pages from extensions
  - `getExtensionAutomationTemplates()` — automation templates from extensions

### 6. Update `ObjectsHomePage` — Show extension objects

**Edit: `src/pages/ObjectsHomePage.tsx`**

- Import `useExtensionManifests` and `useWorkspaceModules`
- After rendering core objects (contacts, companies, deals), render extension objects from the manifest
- Each extension object card shows the same pattern: icon, label, count, click-to-navigate
- Extension objects navigate to existing routes (e.g. `/dashboard/proposals`, `/dashboard/invoices`, `/dashboard/order-notes`) since these pages already exist
- Extension objects are visually indistinguishable from core objects (same card style) but get a subtle "Extension" badge

### 7. Update Marketplace UI — Enable/Disable focus

**Edit: `src/pages/Marketplace.tsx`**

- Rename "Instalar" → "Ativar" / "Desativar" to match the extension language
- For each module card, show "What you get" bullets from `manifest_json.objects`, `manifest_json.automations`, `manifest_json.intelligence`
- Add an "Extensions" tab (replace or alongside "Packs") that shows only official extensions (category filter)
- Enable/Disable button calls the updated `useWorkspaceModules` which routes through the provisioner

**Edit: `src/components/marketplace/ModuleCard.tsx`**

- Accept optional `manifest` prop
- Show 3 bullets: "X objects", "Y automation templates", "Z intelligence capabilities" derived from manifest
- Toggle button instead of Install/Uninstall

### 8. Seed the 3 Official Extensions

Using the **insert tool** (not migration), upsert the 3 extensions into `marketplace_modules` with their manifests:

**8a. Proposals Pack** (`slug: "proposals"`)
```json
{
  "objects": [
    { "type": "proposal", "label": "Proposals", "labelPt": "Propostas", "icon": "FileText", "source_table": "fastcrm_proposals", "color": "text-blue-600", "description": "Propostas comerciais" }
  ],
  "views": [
    { "object_type": "proposal", "name": "Open Proposals", "filter": { "status": "draft" } },
    { "object_type": "proposal", "name": "Signed", "filter": { "status": "accepted" } },
    { "object_type": "proposal", "name": "Expired", "filter": { "status": "expired" } }
  ],
  "automations": [
    { "template_key": "proposal-followup", "label": "Follow-up de proposta", "description": "Enviar follow-up 3 dias após envio sem resposta", "trigger": "proposal.sent" }
  ],
  "intelligence": [
    { "capability": "proposal_risk_flags", "label": "Proposal Follow-up Recommended", "description": "Alerta quando proposta precisa de follow-up" }
  ],
  "feature_flags": ["ext.proposals.enabled"]
}
```

**8b. Finance Pack** (`slug: "invoices"`)
```json
{
  "objects": [
    { "type": "invoice", "label": "Invoices", "labelPt": "Faturas", "icon": "Receipt", "source_table": "invoices", "color": "text-green-600", "description": "Faturação e pagamentos" }
  ],
  "views": [
    { "object_type": "invoice", "name": "Overdue", "filter": { "status": "overdue" } },
    { "object_type": "invoice", "name": "Due This Week", "filter": { "due_this_week": true } }
  ],
  "intelligence": [
    { "capability": "overdue_alerts", "label": "Overdue Invoice Alerts", "description": "Alertas de faturas vencidas" },
    { "capability": "cashflow_insights", "label": "Cashflow Insights", "description": "Insights simples de cashflow" }
  ],
  "settings_pages": [
    { "key": "finance_settings", "label": "Invoice Settings", "route": "/settings/finance" }
  ],
  "feature_flags": ["ext.invoices.enabled"]
}
```

**8c. B2B Revenue Pack** (`slug: "b2b-portal"`)
```json
{
  "objects": [
    { "type": "order", "label": "Orders", "labelPt": "Encomendas", "icon": "ShoppingCart", "source_table": "order_notes", "color": "text-orange-600", "description": "Encomendas e aprovações" }
  ],
  "views": [
    { "object_type": "order", "name": "Pending Approvals", "filter": { "status": "pending" } },
    { "object_type": "order", "name": "Approved Orders", "filter": { "status": "approved" } }
  ],
  "intelligence": [
    { "capability": "orders_awaiting_approval", "label": "Orders Awaiting Approval", "description": "Insight de encomendas a aguardar aprovação" }
  ],
  "feature_flags": ["ext.b2b.enabled"]
}
```

### 9. Create `useExtensionAuditLog` hook

**Create: `src/hooks/useExtensionAuditLog.ts`**

- Query `extension_audit_logs` for the current workspace
- Used by the Settings page to show enable/disable history
- Returns list with `extension_key`, `action`, `created_at`, `user_id`

### 10. Add Extension Audit section to Settings

**Edit: `src/pages/Settings.tsx`** (or create `src/components/settings/ExtensionAuditLog.tsx`)

- Add a "Extensions" section in Settings
- Show table of audit logs: Extension, Action, Date, User
- Link to Marketplace for management

## Files Summary

| File | Action |
|---|---|
| Database migration | **Create** — add `manifest_json` to `marketplace_modules`, create `extension_audit_logs` |
| Data seed (insert tool) | **Insert** — 3 official extension manifests into `marketplace_modules` |
| `supabase/functions/extension-provisioner/index.ts` | **Create** — enable/disable provisioning engine |
| `src/types/extensionManifest.ts` | **Create** — manifest type definitions |
| `src/hooks/useExtensionManifests.ts` | **Create** — fetch + parse manifests for installed extensions |
| `src/hooks/useWorkspaceModules.ts` | **Edit** — route install/uninstall through provisioner edge function |
| `src/hooks/useExtensionAuditLog.ts` | **Create** — query audit logs |
| `src/pages/ObjectsHomePage.tsx` | **Edit** — render extension objects alongside core objects |
| `src/pages/Marketplace.tsx` | **Edit** — enable/disable UX, manifest-driven "what you get" bullets |
| `src/components/marketplace/ModuleCard.tsx` | **Edit** — show manifest summary, toggle button |
| `src/components/settings/ExtensionAuditLog.tsx` | **Create** — audit log table for settings |
| `src/pages/Settings.tsx` | **Edit** — add Extensions section |

## Technical Details

- **No new sidebar items** — extensions only appear inside `/objects`, `/automations`, `/settings` as per the rules
- **No data deletion on disable** — the provisioner only toggles `workspace_modules.status` and feature flags; all data in `fastcrm_proposals`, `invoices`, `order_notes` remains intact
- **Manifest is the contract** — the `manifest_json` column is the single source of truth for what an extension provides; the hardcoded `EXTENSION_REGISTRY` becomes a fallback/legacy that can be phased out
- **Feature flags gate UI** — existing `useFeatureFlag("ext.proposals.enabled")` checks can be used anywhere to conditionally show extension-contributed UI
- **Performance** — manifests are cached in React Query (5-min stale); `ObjectsHomePage` does a single query for all installed manifests rather than per-extension queries
- **Existing pages reused** — Proposals page (`/dashboard/proposals`), Invoices page (`/dashboard/invoices`), Orders page (`/dashboard/order-notes`) already exist; the extension system surfaces them as Objects without creating new routes

