

# Internationalization (i18n) — Full Project Implementation

## Current State

- **No i18n library** installed — zero infrastructure
- **Backoffice**: ~400+ files with hardcoded Portuguese strings ("Guardar", "Cancelar", "Adicionar", "Perfil", "Definições", etc.)
- **Landing page** (`/fastcrm`): Hardcoded English strings across 14 components
- **Old landing** (`Index.tsx`): Hardcoded Portuguese
- **Currency formatting**: Hardcoded `pt-PT` locale and `EUR` across 91+ files
- **Date formatting**: Hardcoded `pt` locale from `date-fns/locale`
- **No language selector** anywhere
- **No geo-detection** for language

## Architecture

### Library: `react-i18next` + `i18next-browser-languagedetector`

Industry standard. Supports:
- Namespace-based translation files
- Browser language auto-detection (navigator.language)
- localStorage persistence
- Lazy loading of translation bundles
- Interpolation for variables

### Languages: PT (default), EN, ES, FR

### Detection Order
1. localStorage (`i18nextLng`)
2. `navigator.language` / `navigator.languages`
3. Fallback: `pt`

### Namespace Strategy (to avoid one giant file)

| Namespace | Scope | ~String Count |
|---|---|---|
| `common` | Shared buttons, labels, status | ~80 |
| `nav` | Navigation items, sidebar, topbar | ~30 |
| `dashboard` | Dashboard cards, headers, metrics | ~50 |
| `crm` | Leads, contacts, companies, opportunities | ~200 |
| `settings` | All settings sections | ~150 |
| `landing` | FastCRM landing page | ~100 |
| `inbox` | Email, messages, compose | ~80 |
| `automations` | Rules, triggers, suggestions | ~60 |
| `intelligence` | Health, forecast, pipeline intelligence | ~60 |
| `invoices` | Invoices, billing, fiscal | ~80 |
| `products` | Products, categories, pricing | ~80 |
| `auth` | Login, signup, onboarding | ~40 |

## Plan

### 1. Install Dependencies

```
react-i18next
i18next
i18next-browser-languagedetector
```

### 2. Create i18n Infrastructure

**`src/i18n/index.ts`** — Initialize i18next with:
- Browser language detector (localStorage → navigator → fallback `pt`)
- All namespaces loaded eagerly (small app, no lazy loading needed)
- Interpolation config

**`src/i18n/locales/pt/`** — One JSON per namespace (common.json, nav.json, etc.)
**`src/i18n/locales/en/`** — Same structure
**`src/i18n/locales/es/`** — Same structure
**`src/i18n/locales/fr/`** — Same structure

### 3. Language Selector Components

**`src/components/ui/LanguageSelector.tsx`** — Dropdown with flag icons + language name. Used in:
- `TopBar.tsx` (backoffice) — between Help and Avatar
- `LandingStickyHeader.tsx` (landing) — before Sign In
- `Settings > ExperienceSettings` — full language preference section

### 4. Geo-Detection Enhancement

On first visit (no `i18nextLng` in localStorage), use `navigator.language`:
- `pt`, `pt-BR`, `pt-PT` → PT
- `es`, `es-*` → ES
- `fr`, `fr-*` → FR
- Everything else → EN

No external geo-IP API needed — browser language is sufficient and privacy-friendly.

### 5. Systematic String Extraction (All Files)

Replace every hardcoded string with `t('namespace:key')`. This affects:

**Navigation & Layout** (~10 files):
- `TopBar.tsx`, `Sidebar.tsx`, `SidebarV1.tsx`, `nav.v2.ts`, `DashboardHeader.tsx`, `ClubSidebar.tsx`, `HelpSupportDropdown.tsx`

**Dashboard** (~15 files):
- `RevenueHero.tsx`, `ForecastConfidenceCard.tsx`, `ForecastTrendChart.tsx`, `PipelineHealthCard.tsx`, `DealsAtRiskList.tsx`, `AIActionSuggestions.tsx`, `DashboardAutomationSuggestions.tsx`, `PipelineComparisonCard.tsx`, `WelcomeOverlay.tsx`

**CRM** (~40 files):
- Lead pages, contact pages, company pages, opportunity pages
- All create/edit dialogs
- Kanban board, table views, filters
- Detail pages and sections

**Settings** (~15 files):
- All settings sections (Workspace, Channels, CRM, Templates, Automation, Experience, Security, Integrations, Billing)
- `SettingsNavigation.tsx`, `settingsSearchData.ts`

**Landing Pages** (~15 files):
- All `landing-fastcrm/` components
- `Index.tsx` (old landing)
- `PublicLandingPage.tsx`

**Inbox & Email** (~15 files):
- Compose dialog, inbox panels, email templates

**Automations** (~10 files):
- Rule builder, suggestions panel, test runner

**Intelligence** (~10 files):
- Health settings, forecast cards, pipeline comparison

**Invoices & Products** (~20 files):
- Invoice detail, list, creation
- Product management, categories, pricing

**Auth** (~5 files):
- Login, Signup, Onboarding

**Other** (~30+ files):
- Tasks, proposals, reports, calendar, forms, community, etc.

### 6. Currency & Date Locale Adaptation

Create utility functions:
- `formatCurrency(value, currency?)` — uses current i18n locale
- `formatDate(date, format?)` — uses correct date-fns locale
- `getDateLocale()` — returns pt/en/es/fr locale object

Replace all 91+ `Intl.NumberFormat("pt-PT", ...)` calls and all `date-fns/locale` imports.

### 7. User Preference Persistence

Store language preference in `user_preferences` or workspace settings so it persists across devices. On login, apply stored preference.

## File Summary (Key New Files)

| File | Action | Description |
|---|---|---|
| `src/i18n/index.ts` | **NEW** | i18next initialization + detection config |
| `src/i18n/locales/pt/common.json` | **NEW** | Portuguese common translations |
| `src/i18n/locales/pt/nav.json` | **NEW** | Portuguese navigation translations |
| `src/i18n/locales/pt/dashboard.json` | **NEW** | Portuguese dashboard translations |
| `src/i18n/locales/pt/crm.json` | **NEW** | Portuguese CRM translations |
| `src/i18n/locales/pt/settings.json` | **NEW** | Portuguese settings translations |
| `src/i18n/locales/pt/landing.json` | **NEW** | Portuguese landing translations |
| `src/i18n/locales/pt/inbox.json` | **NEW** | Portuguese inbox translations |
| `src/i18n/locales/pt/automations.json` | **NEW** | Portuguese automations translations |
| `src/i18n/locales/pt/intelligence.json` | **NEW** | Portuguese intelligence translations |
| `src/i18n/locales/pt/invoices.json` | **NEW** | Portuguese invoices translations |
| `src/i18n/locales/pt/products.json` | **NEW** | Portuguese products translations |
| `src/i18n/locales/pt/auth.json` | **NEW** | Portuguese auth translations |
| `src/i18n/locales/en/*.json` | **NEW** | English translations (all 12 namespaces) |
| `src/i18n/locales/es/*.json` | **NEW** | Spanish translations (all 12 namespaces) |
| `src/i18n/locales/fr/*.json` | **NEW** | French translations (all 12 namespaces) |
| `src/components/ui/LanguageSelector.tsx` | **NEW** | Language dropdown component |
| `src/lib/formatters.ts` | **NEW** | Locale-aware currency + date formatters |
| `src/main.tsx` | **EDIT** | Import i18n initialization |
| `src/components/layout/TopBar.tsx` | **EDIT** | Add LanguageSelector |
| `src/components/landing-fastcrm/LandingStickyHeader.tsx` | **EDIT** | Add LanguageSelector |
| ~200+ component files | **EDIT** | Replace hardcoded strings with `t()` calls |

## Technical Details

### i18n Initialization
```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en', 'es', 'fr'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    ns: ['common', 'nav', 'dashboard', 'crm', ...],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    resources: { pt: {...}, en: {...}, es: {...}, fr: {...} }
  });
```

### Usage Pattern in Components
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('dashboard');
  return <h1>{t('greeting')}</h1>;
}
```

### Locale-Aware Formatters
```typescript
// src/lib/formatters.ts
import i18n from '@/i18n';
import { pt, enUS, es, fr } from 'date-fns/locale';

const localeMap = { pt, en: enUS, es, fr };

export function formatCurrency(value: number, currency = 'EUR') {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency', currency
  }).format(value);
}

export function getDateLocale() {
  return localeMap[i18n.language] || pt;
}
```

## Implementation Order

Due to the massive scope (~200+ files), implementation will proceed in this order within a single pass:

1. Infrastructure (i18n init, translation files, formatters)
2. LanguageSelector component
3. Layout files (TopBar, Sidebar, Header)
4. Landing pages
5. Dashboard components
6. CRM pages (leads, contacts, companies, opportunities)
7. Settings
8. Inbox & Email
9. Automations & Intelligence
10. Invoices & Products
11. Auth & Onboarding
12. Remaining files

