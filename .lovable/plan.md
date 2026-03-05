

# CRM Lead Enricher — Kernel V2 Stabilization

## Current State

| Area | File | Mutations | Kernel Events | Logging |
|------|------|-----------|---------------|---------|
| Single Enrich | `useLeadEnrichment.ts` | invoke `contact-enrich` + update lead | None | `console.error` only |
| Batch Enrich | `useLeadEnrichment.ts` | sequential enrich loop | None | `console.error` per failure |
| Contact Enrich | `useContactEnrichment.ts` | invoke `contact-enrich` + insights | None | `console.error` only |
| Settings | `useLeadEnricherSettings.ts` | upsert settings | None | Toast only |
| Credits | `useCredits.ts` | consume credits | None | None |
| Smoke Tests | `system-run-smoke-tests` | — | — | No enrichment-specific check |

## Implementation Plan

### A) Kernel Events + Logging — `src/hooks/useLeadEnrichment.ts`

Import `emitKernelEvent`. All events: `source_module: 'crm-lead-enricher'`, `entity_kind: 'lead'`.

1. `useEnrichLead` — before API call → `LEAD.ENRICH_REQUESTED` (payload: `has_email`, `has_phone`, `settings_sources`)
2. `useEnrichLead.onSuccess` → `LEAD.ENRICH_COMPLETED` (payload: `fields_updated`, `confidence_score`, `email_validated`)
3. `useEnrichLead.onError` → `console.warn('[ENRICHER] ENRICH_FAILED', { leadId, error })`
4. Email validation failure → `console.warn('[ENRICHER] EMAIL_VALIDATION_FAILED')`; prefix existing `console.error`
5. Batch: log start `console.log('[ENRICHER] Batch started: ${total} leads')`
6. Batch: per-failure → `console.warn('[ENRICHER] Batch item failed: ${lead.name}')`; prefix existing
7. Batch: completion → `console.log('[ENRICHER] Batch completed: ${successCount}/${total}')`

### B) Kernel Events + Logging — `src/hooks/useContactEnrichment.ts`

Import `emitKernelEvent`. Events: `source_module: 'crm-lead-enricher'`, `entity_kind: 'contact'`.

1. `useContactEnrichment.onSuccess` → `LEAD.ENRICH_COMPLETED` (payload: `fields_found`, `source: 'contact-enrich'`)
2. `useContactEnrichment.onError` → `console.warn('[ENRICHER] CONTACT_ENRICH_FAILED')`; prefix existing
3. `useContactInsights.onError` → `console.warn('[ENRICHER] CONTACT_INSIGHTS_FAILED')`; prefix existing
4. `useRefreshContactInsights.onError` → prefix with `[ENRICHER]`
5. `useGenerateContactMessage.onError` → prefix with `[ENRICHER]`

### C) Logging — `src/hooks/useLeadEnricherSettings.ts`

Add `[ENRICHER]` prefixed logging (no kernel events — settings are config-only):
1. `updateSettings.onSuccess` → `console.log('[ENRICHER] Settings updated')`
2. `updateSettings.onError` → `console.warn('[ENRICHER] SETTINGS_UPDATE_FAILED')`

### D) Smoke Tests

Add to `system-run-smoke-tests`:
- `lead_enricher_settings` table check (module: `crm-lead-enricher`)
- `credit_consumption_logs` table check (module: `crm-lead-enricher`)

## File Plan

| File | Action |
|------|--------|
| `src/hooks/useLeadEnrichment.ts` | Import `emitKernelEvent`; emit `ENRICH_REQUESTED` + `ENRICH_COMPLETED`; add `[ENRICHER]` logging for batch + API errors |
| `src/hooks/useContactEnrichment.ts` | Emit `LEAD.ENRICH_COMPLETED` on contact enrich; prefix all logs with `[ENRICHER]` |
| `src/hooks/useLeadEnricherSettings.ts` | Add `[ENRICHER]` prefixed logging for settings mutations |
| `supabase/functions/system-run-smoke-tests/index.ts` | Add `lead_enricher_settings` + `credit_consumption_logs` checks |

