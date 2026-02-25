

# Fix Build Error + Attio-Style Settings Redesign

## 1. Build Error Fix (immediate)

**File**: `src/components/opportunities/OpportunityTableView.tsx` line 41

The `Locale` type is used but not imported. Fix: add `import type { Locale } from "date-fns";` or change the type annotation to remove the explicit `Locale` reference.

```typescript
// Change line 41 from:
const dateLocales: Record<string, Locale> = { pt, en: enUS, es, fr };
// To:
const dateLocales: Record<string, typeof pt> = { pt, en: enUS, es, fr };
```

---

## 2. Attio-Style Settings Page Redesign

Inspired by the Attio screenshot, the current Settings page will be restructured with a cleaner, more organized sidebar with grouped sections (Personal vs Workspace), and a dedicated Profile section matching Attio's layout.

### Current vs Proposed

| Aspect | Current | Proposed (Attio-style) |
|---|---|---|
| Sidebar | Flat list of 11 categories | **Grouped sections**: Personal (Profile, Appearance, Notifications) + Workspace (General, Members & Teams, Channels, CRM, etc.) |
| Profile | Separate `/profile` page with card grid | **Integrated into Settings** as first "Personal" section with inline avatar upload, first/last name fields, email with Edit button, time preferences |
| Search | Basic text search | Same but with cleaner styling |
| Section headers | Bold text + description | Light category group labels (like "Personal", "Workspace") |
| Active state | Primary color background | Subtle left border accent + light background |
| Navigation items | Icon + label + description | Icon + label only (cleaner), with descriptions as tooltip |

### New Sidebar Structure

```text
Personal
  ├─ Profile           (avatar, name, email, timezone)
  ├─ Appearance        (theme, language, date format)
  ├─ Notifications     (email, push, in-app preferences)

Workspace
  ├─ General           (workspace name, logo, slug)
  ├─ Members & Teams   (invite, roles, permissions)
  ├─ Channels          (email, WhatsApp, forms)
  ├─ CRM & Data        (fields, pipelines, import)
  ├─ Templates         (messages, proposals)
  ├─ Automation & AI   (rules, scoring, suggestions)

Advanced
  ├─ Security          (SSO, audit, 2FA)
  ├─ Integrations      (API keys, webhooks, Stripe)
  ├─ Billing           (plan, usage, invoices)
  ├─ Extensions        (installed, audit log)
  ├─ Developer         (feature flags, API docs)
```

### New Profile Section (Attio-inspired)

Replaces the current card-based `/profile` page with an inline settings section:

```text
┌──────────────────────────────────────────────────┐
│  Profile                                         │
│  Manage your personal details                    │
│                                                  │
│  ℹ️ Changes apply to all your workspaces         │
│                                                  │
│  Profile Picture                                 │
│  [Avatar]  PNGs, JPEGs and GIFs under 10MB       │
│  [🟢 Upload new image] [🗑️]                      │
│                                                  │
│  First Name          Last Name                   │
│  ┌──────────┐       ┌──────────┐                 │
│  │ João     │       │ Silva    │                 │
│  └──────────┘       └──────────┘                 │
│                                                  │
│  Primary Email Address                           │
│  ┌────────────────────────────────┐ [Edit]       │
│  │ joao@company.com              │               │
│  └────────────────────────────────┘              │
│                                                  │
│  Time preferences                                │
│  Manage your time preferences                    │
│                                                  │
│  Preferred Timezone    Start week on              │
│  [Europe/Lisbon ▼]    [Monday ▼]                 │
└──────────────────────────────────────────────────┘
```

### New Appearance Section

Extracts language/theme/date format from the current scattered locations into one dedicated section:

- Theme toggle (light/dark/system)
- Language selector (PT/EN/ES/FR)
- Date format preference
- Currency preference

### File Plan

| File | Action |
|---|---|
| `src/components/opportunities/OpportunityTableView.tsx` | **FIX** — Change `Locale` type to `typeof pt` |
| `src/components/settings/SettingsNavigation.tsx` | **REWRITE** — Grouped sidebar with Personal/Workspace/Advanced sections, cleaner item styling |
| `src/pages/Settings.tsx` | **EDIT** — Add new categories (profile, appearance, notifications), update routing, merge Profile page content |
| `src/components/settings/sections/ProfileSettings.tsx` | **NEW** — Attio-style profile editor (avatar, split name fields, email with edit, timezone, week start) |
| `src/components/settings/sections/AppearanceSettings.tsx` | **NEW** — Theme, language, date format, currency |
| `src/components/settings/sections/NotificationSettings.tsx` | **NEW** — Email/push/in-app notification preferences |
| `src/i18n/locales/{pt,en,es,fr}/settings.json` | **EXPAND** — Add ~40 new keys for profile, appearance, notification strings |
| `src/pages/Profile.tsx` | **EDIT** — Redirect to `/settings/profile` instead of standalone page |

### Enhancements Over Attio

1. **Unified search** across all sections (Personal + Workspace) — Attio has no cross-section search
2. **i18n from day one** — All labels translated in 4 languages
3. **Role-aware visibility** — Workspace sections hidden for viewers, admin sections gated
4. **Responsive** — Sidebar collapses to sheet on mobile (Attio is desktop-only settings)
5. **Time preferences** include timezone auto-detect suggestion based on browser
6. **Profile changes propagate** — Info banner "Changes apply to all your workspaces" like Attio

### Implementation Order

1. Fix the `Locale` build error (1 line)
2. Expand settings.json files with new keys (4 files)
3. Create ProfileSettings, AppearanceSettings, NotificationSettings components (3 files)
4. Rewrite SettingsNavigation with grouped sections
5. Update Settings.tsx with new categories and routing
6. Update Profile.tsx to redirect

