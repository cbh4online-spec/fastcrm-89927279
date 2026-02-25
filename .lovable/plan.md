

# Fix: Language Selector Changes Flag But UI Doesn't Translate

## Problem

The i18n infrastructure is correctly set up (i18next, LanguageDetector, 48 JSON translation files across 4 languages). The `LanguageSelector` component correctly calls `i18n.changeLanguage()` and the flag updates. However, **only 7 out of ~548 files** actually use `useTranslation()` with `t()` calls. The remaining files have hardcoded Portuguese or English strings, so changing the language has no visible effect.

## Root Cause

The migration from hardcoded strings to `t('namespace:key')` was never completed. The infrastructure was built but the actual string replacement across components was not done.

## Plan

Given the massive scope (~548 files), this will be done in priority order, starting with the most visible components.

### Batch 1 — Layout and Navigation (highest visibility)

These are always visible on screen regardless of which page the user is on.

**Files to edit:**
- `src/components/layout/TopBar.tsx` — Replace "Perfil", "Definições", "Terminar sessão", "Gestão SaaS", "Ask FastCRM about your revenue" with `t()` calls
- `src/config/nav.v2.ts` — Keep static English keys (already matched to nav.json keys), but update `Sidebar.tsx` to translate them dynamically
- `src/components/layout/Sidebar.tsx` — Already uses `t()` for nav items (done)
- `src/components/layout/HelpSupportDropdown.tsx` — Already uses `t()` (done)

### Batch 2 — Contact Detail Page (user's current page)

The user is currently viewing a contact detail page. This is a high-priority page with ~589 lines.

**Files to edit:**
- `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` — Replace all hardcoded section titles, button labels, dialog strings
- `src/components/contacts/eni/ENIContactTypes.ts` — Translate `ENTITY_TYPE_LABELS`
- `src/components/contacts/eni/sections/IdentificationSection.tsx` — Field labels
- `src/components/contacts/eni/sections/AddressSection.tsx` — Field labels
- `src/components/contacts/eni/sections/ProfessionalProfileSection.tsx` — Field labels
- `src/components/contacts/eni/sections/CommercialProfileSection.tsx` — Field labels
- `src/components/contacts/eni/sections/FinancialSection.tsx` — Field labels
- `src/components/contacts/eni/sections/NotesSection.tsx` — Labels
- `src/components/contacts/eni/sections/AIInsightsSection.tsx` — Labels
- `src/components/contacts/eni/sections/DocumentsSection.tsx` — Labels

### Batch 3 — Dashboard Components

- `src/components/dashboard/RevenueHero.tsx`
- `src/components/dashboard/ForecastConfidenceCard.tsx`
- `src/components/dashboard/PipelineHealthCard.tsx`
- `src/components/dashboard/DealsAtRiskList.tsx`
- `src/components/dashboard/AIActionSuggestions.tsx`
- `src/components/dashboard/PLGSignalsFeed.tsx`
- `src/components/dashboard/PipelineComparisonCard.tsx`
- `src/components/dashboard/WelcomeOverlay.tsx`

### Batch 4 — CRM Pages (Leads, Companies, Opportunities)

- Lead list page and create/edit dialogs
- Company list page and detail page
- Opportunity/Deal pages and Kanban board
- All shared filter components, table headers

### Batch 5 — Settings, Inbox, Automations, Intelligence, Invoices, Products, Auth

Remaining pages using their respective namespace translations.

### Translation File Updates

The existing JSON files already contain many keys but will need additional keys as we discover hardcoded strings during migration. Each namespace file will be expanded for all 4 languages (PT, EN, ES, FR).

### Pattern Applied to Each File

```typescript
// Before
<Button>Guardar</Button>
<span>Cancelar</span>
<h1>Contactos</h1>

// After
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('crm');
const { t: tc } = useTranslation('common');

<Button>{tc('save')}</Button>
<span>{tc('cancel')}</span>
<h1>{t('contacts')}</h1>
```

### Implementation Strategy

Due to the massive number of files, implementation will proceed across multiple messages:
1. **This message**: Batches 1-2 (TopBar + Contact Detail page sections) — immediate visible impact
2. **Next messages**: Batches 3-5 progressively

### Estimated File Count Per Batch

| Batch | Files | Priority |
|---|---|---|
| 1 — Layout | 2 files | Critical (always visible) |
| 2 — Contact Detail | ~12 files | Critical (user's current page) |
| 3 — Dashboard | ~8 files | High |
| 4 — CRM Pages | ~30 files | High |
| 5 — Rest | ~100+ files | Medium |

