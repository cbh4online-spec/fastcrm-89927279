

# Plan: Invoices i18n, Performance i18n & Contacts UX Improvements

## Scope

Three modules need improvements: **Invoices** (full i18n), **Performance Dashboard** (full i18n), and **Contacts** (minor CSV export i18n fix). The Contacts module is already well internationalized from prior work.

---

## 1. Invoices Page — Full i18n (~60 hardcoded strings)

**`src/pages/Invoices.tsx`** has extensive hardcoded Portuguese: status labels, tab names, sort options, filter groups, table headers, action menu items, bulk actions bar, empty state, pagination, and CSV export headers.

### Changes:
- Add `useTranslation("invoices")` 
- Move `statusConfig`, `pageTabs`, `sortOptions`, `filterGroups` into `useMemo` with `t()` calls
- Replace all inline strings: table headers ("Número", "Cliente", "Data Emissão", "Vencimento", "Total", "Estado"), action items ("Ver detalhes", "Descarregar PDF", "Marcar como enviada", "Marcar como paga", "Eliminar"), confirm dialog, bulk bar ("selecionada/selecionadas", "Exportar"), empty state ("Sem faturas", "Crie a sua primeira fatura..."), pagination ("Mostrar", "por página", "Página X de Y"), KPI labels ("Rascunho", "Enviadas", "Pagas", "Vencidas"), search placeholder, filter labels
- Add ~50 new keys to `invoices.json` across 4 locales

### New translation keys (examples):
`statusDraft`, `statusSent`, `statusPaid`, `statusOverdue`, `statusCancelled`, `tabInvoices`, `tabRecurring`, `tabFiscal`, `tabSaft`, `tabSettings`, `sortNewest`, `sortOldest`, `sortHighestValue`, `sortLowestValue`, `sortDueSoon`, `sortNumberAsc`, `filterStatus`, `filterValue`, `filterPeriod`, `filterSmart`, `valueHigh`, `valueMedium`, `valueLow`, `timingToday`, `timingWeek`, `timingMonth`, `timingQuarter`, `dueSoon7`, `highValuePending`, `recurringClients`, `colNumber`, `colClient`, `colIssueDate`, `colDueDate`, `colTotal`, `colStatus`, `viewDetails`, `markAsSent`, `deleteInvoice`, `confirmDelete`, `noInvoices`, `noInvoicesDesc`, `createFirstInvoice`, `selectedCount`, `export`, `show`, `perPage`, `pageOf`, `searchInvoices`, `newInvoice`, `kpiDraft`, `kpiSent`, `kpiPaid`, `kpiOverdue`, `invoicesExported`

---

## 2. Performance Dashboard — Full i18n (~30 hardcoded strings)

**`src/pages/performance/PerformanceDashboardPage.tsx`** has all strings in Portuguese with no translation hook.

### Changes:
- Create `src/i18n/locales/{pt,en,es,fr}/performance.json` with ~30 keys
- Add `useTranslation("performance")` to the component
- Register namespace in i18n config
- Replace: page title/description, "Recalcular", KPI titles ("Receita Fechada", "Pipeline Gerado", "Reuniões Realizadas", "Performers Ativos"), "Leaderboard Semanal", "Ver tudo", "Sem dados de performance...", leaderboard labels ("receita", "reuniões", "pontos"), "Desafios Ativos", "Criar Desafio", "Nenhum desafio ativo", "d restantes", "Metas Ativas", "Gerir", "Nenhuma meta definida", "Reconhecimentos", "Sem reconhecimentos ainda"
- Use `formatDistanceToNow` with `getDateLocale()` instead of hardcoded `pt` locale

### New translation keys:
`title`, `description`, `recalculate`, `closedRevenue`, `pipelineGenerated`, `meetingsHeld`, `activePerformers`, `weeklyLeaderboard`, `viewAll`, `noPerformanceData`, `noPerformanceDataHint`, `revenue`, `meetings`, `points`, `activeChallenges`, `createChallenge`, `noChallenges`, `daysRemaining`, `activeGoals`, `manage`, `noGoals`, `recognitions`, `noRecognitions`

---

## 3. Contacts — Minor CSV header fix

The `handleExport` in `AttioContactsTable.tsx` still has hardcoded CSV headers: `["Nome", "Email", "Telefone", "Empresa", "Temperatura", "Score"]`. Replace with `t()` calls using existing keys.

---

## 4. i18n namespace registration

Add `"performance"` to the namespace list in `src/i18n/index.ts`.

---

## Files to Create
- `src/i18n/locales/pt/performance.json` (~30 keys)
- `src/i18n/locales/en/performance.json`
- `src/i18n/locales/es/performance.json`
- `src/i18n/locales/fr/performance.json`

## Files to Edit
- `src/pages/Invoices.tsx` — full i18n refactor
- `src/pages/performance/PerformanceDashboardPage.tsx` — full i18n refactor
- `src/i18n/locales/{pt,en,es,fr}/invoices.json` — ~50 new keys each
- `src/components/contacts/AttioContactsTable.tsx` — CSV header fix (line 220)
- `src/i18n/index.ts` — register `performance` namespace

## Execution Order
1. Translation files (invoices + performance, 4 locales each)
2. Invoices page refactor
3. Performance dashboard refactor
4. Contacts CSV fix
5. i18n config update

