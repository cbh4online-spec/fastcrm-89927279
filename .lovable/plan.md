

# Batch 4 — CRM Pages i18n Migration

## Scope

Migrate the 4 main CRM list pages (Leads, Contacts, Companies, Opportunities) and their sub-components to use `t()` calls from the `crm` namespace. This covers ~200 hardcoded Portuguese strings across 12 files.

## Files to Edit (12 components)

| File | Hardcoded Strings (approx.) |
|---|---|
| `SmartLeadsTable.tsx` | Column labels (30+), filter labels, tab labels, sort options, toast messages, empty states, pagination, bulk actions |
| `SmartLeadsKPIs.tsx` | 6 KPI titles + descriptions |
| `SmartFilters.tsx` | Filter labels, placeholders, select options |
| `SmartLeadRow.tsx` | Status labels, temperature labels, next action labels, tooltips, dropdown menu items, hardcoded `pt` date locale |
| `AttioContactsTable.tsx` | Column labels (20+), sort options, filter fields, bulk edit fields, header, tooltips, empty states, pagination, toast messages |
| `SmartContactsKPIs.tsx` | 6 KPI titles + descriptions |
| `SmartCompaniesTable.tsx` | Column labels (24+), filter groups, tab labels, sort options, toast messages, empty states, pagination, bulk actions |
| `SmartCompaniesKPIs.tsx` | 6 KPI titles + descriptions |
| `OpportunitiesModule.tsx` | Header, status filter labels, loading message, empty state, toast messages, button labels, invoice prompt dialog |
| `OpportunityKPICards.tsx` | 8 KPI titles + descriptions |
| `PipelineSummaryBar.tsx` | 5 metric labels + sublabels |
| `OpportunityTableView.tsx` | Table headers (11), status badges, dropdown menu items, empty state, hardcoded `pt` date locale |

## Translation Keys to Add (~150 new keys)

### Leads Section
- Column labels: `col_lead`, `col_email`, `col_phone`, `col_externalEmail`, `col_fax`, `col_source`, `col_status`, `col_tags`, `col_company`, `col_companyStatus`, `col_address`, `col_city`, `col_county`, `col_parish`, `col_region`, `col_postalCode`, `col_latitude`, `col_longitude`, `col_temperature`, `col_score`, `col_aiLeadType`, `col_nextAction`, `col_insight`, `col_lastAnalysis`, `col_sla`, `col_estimatedValue`, `col_conversionProb`, `col_automation`, `col_assignedTo`, `col_lastContact`, `col_businessCategory`, `col_services`, `col_taxId`, `col_foundingDate`, `col_capitalSocial`, `col_legalNature`, `col_caeCodes`, `col_caeDescription`, `col_website`, `col_linkedin`, `col_facebook`, `col_instagram`, `col_twitter`, `col_googlePlaceId`, `col_rating`, `col_reviewsCount`, `col_priceLevel`, `col_instagramId`, `col_whatsappId`, `col_externalUsername`, `col_createdAt`, `col_updatedAt`
- Filter labels: `filterTemperature`, `filterStatus`, `filterActivity`, `filterSmartFilters`, `filterHot`, `filterWarm`, `filterCold`, `filterNew`, `filterContacted`, `filterQualified`, `filterInProposal`, `filterLost`, `filterWaitingReply`, `filterNoReply48h`, `filterActiveConversation`, `filterMaxPriority`, `filterReadyToConvert`, `filterNurture`, `filterAtRisk`
- Tab labels: `tabLeads`, `tabSmartLists`, `tabAutomations`, `tabImport`
- Sort labels: `sortNewest`, `sortOldest`, `sortHighestScore`, `sortLowestScore`, `sortHighestValue`, `sortLastContact`
- Actions: `import`, `newLead`, `refresh`, `searchLeads`, `selected`, `analyzeAI`, `analyzeLinkedIn`, `export`, `delete`, `sendMessage`, `createOpportunity`, `activateAutomation`, `archive`
- Empty states: `noLeadsYet`, `noLeadsDesc`, `addLead`
- Pagination: `show`, `perPage`, `totalLeads`, `pageOf`
- Toasts: `leadsDeleted`, `errorDeletingLeads`, `leadAnalyzed`, `rateLimitReached`, `aiCreditsExhausted`, `errorAnalyzing`, `analyzingLeads`, `leadsAnalyzed`, `errorBulkAnalyze`, `noLinkedInUrl`, `analyzingLinkedIn`, `exportComplete`
- KPIs: `kpiLeadsToday`, `kpiLeadsTodayDesc`, `kpiHotLeads`, `kpiHotLeadsDesc`, `kpiNoResponse24h`, `kpiNoResponse24hDesc`, `kpiAvgTime`, `kpiAvgTimeDesc`, `kpiConversions`, `kpiConversionsDesc`, `kpiPipeline`, `kpiPipelineDesc`
- SmartLeadRow: `statusNew`, `statusInProgress`, `statusQualified`, `tempCold`, `tempWarm`, `tempHot`, `tempTooltip`, `scoreTooltip`, `nextActionTooltip`, `actionReplyManual`, `actionSendTemplate`, `actionCreateOpportunity`, `actionActivateAutomation`, `actionArchive`, `actionFollowUp`, `insightTooltip`, `automationActive`, `now`

### Contacts Section
- Similar column/sort/filter labels
- KPIs: `kpiTotalContacts`, `kpiHotContacts`, `kpiNoResponse`, `kpiAvgScore`, `kpiDecisionMakers`, `kpiContactsPipeline`
- Header: `contactsTitle`, `contactsTooltip`, `newContact`
- Empty: `noContactsYet`, `noContactsDesc`
- Bulk edit field labels

### Companies Section
- Filter groups: company-specific (size, industry, activity labels)
- KPIs: `kpiTotalCompanies`, `kpiHotCompanies`, `kpiClients`, `kpiProspects`
- Tab labels, sort options, bulk actions
- Empty: `noCompaniesYet`, `noCompaniesDesc`

### Opportunities Section
- Header: `opportunitiesTitle`, `opportunitiesDesc`, `newOpportunity`
- Status filters: `allStatus`, `open`, `won`, `lost`
- Pipeline metrics: `activeDeals`, `pipelineValue`, `weightedValue`, `avgCycle`, `conversionRate`
- KPIs: 8 cards (pipelineValue, weightedValue, openOpps, conversionRate, won, lost, avgDealSize, avgCloseTime)
- Table headers and dropdown actions
- Invoice prompt dialog strings
- Loading: `loadingOpportunities`

## Implementation Pattern

Each component gets:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('crm');
```

Date-fns locale switches to dynamic:
```typescript
import { pt, enUS, es, fr } from 'date-fns/locale';
const dateLocales = { pt, en: enUS, es, fr };
const locale = dateLocales[i18n.language] || pt;
```

Column configs, filter groups, sort options, and status/temperature maps become functions that receive `t` instead of hardcoded objects.

## Implementation Order

1. Expand all 4 `crm.json` files with ~150 new keys
2. Edit all 12 component files in parallel

## Technical Notes

- Column labels like `LEAD_COLUMNS`, `CONTACT_COLUMNS`, `COMPANY_COLUMNS` are currently declared as module-level constants. They will need to be moved inside the component (or into a `useMemo` with `t` dependency) so they can access `t()`.
- Same for `filterGroups`, `pageTabs`, `sortOptions`, `statusLabels`, `temperatureConfig`, `nextActionLabels` in the various files.
- `SmartLeadRow.tsx` and `OpportunityTableView.tsx` use hardcoded `pt` locale for `date-fns` -- will be made dynamic.

