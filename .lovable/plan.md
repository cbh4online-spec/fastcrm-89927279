

# Vertical-Clinic — Module Assessment

## Finding: Module Does Not Exist

After thorough exploration of the codebase, **there is no `vertical-clinic` module**. The project has:

- **Two modules**: `credit-intermediation/` and `growth-seo/` under `src/modules/`
- **No patient, appointment, treatment, or consent tables** in the database
- **No clinical hooks or components** — only references to "clinic" as a business type label in prospecting, AI profiles, and landing pages
- **Scheduling exists** (`SchedulingHub`, `useCalendarEvents`, `useMeetings`) but is a generic calendar/meeting system, not a clinical vertical

The "consent" references found are exclusively GDPR cookie consent (`gdpr_consents` table), not medical consent forms.

## What Exists That Could Relate

| Feature | Location | Nature |
|---------|----------|--------|
| Calendar/Events | `useCalendarEvents.ts`, `SchedulingHub` | Generic scheduling, already has kernel events ✓ |
| Meetings | `useMeetings` | Generic CRM meetings |
| AI Profile type "clinica" | `useAIProfiles.ts` | Just a persona label, no clinical logic |
| Health KPI type | `useKPIs.ts` | Stub with hardcoded `noShowRate: 0` |
| Business type "clinic" | `BusinessTypeFilter.tsx` | B2B portal filter label |

## Options

Since this module doesn't exist, there are two paths:

**Option A — Skip**: Mark `vertical-clinic` as "not implemented" in the stabilization tracker and move on.

**Option B — Build**: Create the full vertical-clinic module from scratch, which would require:
- New database tables: `patients`, `appointments`, `treatments`, `consent_forms`, `consent_signatures`
- New hooks: `usePatients`, `useAppointments`, `useTreatments`, `useConsentForms`
- New UI components for patient management, appointment scheduling, treatment tracking, consent signing
- Kernel events: `PATIENT.CREATED`, `APPOINTMENT.SCHEDULED`, `TREATMENT.STARTED`, `CONSENT.SIGNED`
- Integration with existing calendar system
- Smoke tests for all new tables

Option B is a major feature build (not a stabilization task) and would require separate scoping.

**Recommendation**: This is a stabilization pass — Option A is appropriate. The vertical-clinic module should be scoped as a separate feature initiative.

