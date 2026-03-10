

# Plan: CRM Modules — i18n, Actions & Consistency

## Current State

- **Leads (`SmartLeadsTable`)**: Already uses `useTranslation("crm")` and `PageHeader` with "Nova Lead" + "Importar" buttons. Well internationalized.
- **Companies (`SmartCompaniesTable`)**: Already uses `useTranslation("crm")` and `PageHeader` with "Nova Empresa" + "Importar" buttons. Well internationalized. Has some hardcoded strings in bulk actions ("Revenue Intelligence", "Duplicados").
- **Contacts (`SmartContactsTable`)**: **Not internationalized**. ~125 hardcoded Portuguese strings across column definitions, filter groups, sort options, page tabs, bulk edit fields, toast messages, and PageHeader labels. No `useTranslation` hook.

## Changes

### 1. Full i18n of `SmartContactsTable.tsx` (~938 lines)

The biggest task. All hardcoded strings need translation keys:
- **Column labels** (lines 42-125): ~40 labels like "Contacto", "Nº Cliente", "Cargo", "Temperatura", etc.
- **Bulk edit fields** (lines 130-248): ~35 labels like "Nome", "Empresa", "Morada", etc.
- **Filter groups** (lines 251-296): ~15 labels like "Quente", "Morno", "Frio", "Clientes Ativos", etc.
- **Page tabs** (lines 299-304): 4 labels
- **Sort options** (lines 307-318): 10 labels
- **Toast messages** (lines 489-544): ~8 messages
- **PageHeader** (lines 564-583): title, button labels
- **Toolbar** (line 588): search placeholder
- **Inline strings** throughout the component: "Duplicados", "Exportação concluída", etc.

Will add `useTranslation("crm")` and replace all strings with `t()` calls. New keys will be added to all 4 locale files.

### 2. Add ~60 new translation keys to `crm.json` (PT/EN/ES/FR)

Keys for contacts columns, filters, sort options, bulk edit labels, and remaining hardcoded strings in companies module ("Revenue Intelligence", "Duplicados" button text).

### 3. Minor fixes in `SmartCompaniesTable.tsx`

- Replace remaining hardcoded strings: `"Revenue Intelligence"` (line 267), `"Duplicados"` (line 235), `"A analisar revenue intelligence..."` (line 140), toast messages (lines 144, 148).

### 4. Add "View Lifecycle" link

- In contacts and companies detail pages, add a navigation link to `/lifecycle` in the sidebar/overview section. This is a small addition to existing detail components.

## Files to Edit
- `src/components/contacts/SmartContactsTable.tsx` — full i18n refactor
- `src/components/companies/SmartCompaniesTable.tsx` — fix remaining hardcoded strings
- `src/i18n/locales/pt/crm.json` — ~60 new keys
- `src/i18n/locales/en/crm.json` — ~60 new keys
- `src/i18n/locales/es/crm.json` — ~60 new keys
- `src/i18n/locales/fr/crm.json` — ~60 new keys

## Notes
- Leads and Companies already have "New" and "Import" buttons in PageHeader — no changes needed there.
- The AI temperature/score fields are already displayed in all three tables and update correctly via existing hooks.
- Duplicate detection already exists for all three entity types via `UnifiedDuplicateDialog`.

