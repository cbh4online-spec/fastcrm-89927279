
# Vertical-Clinic — Stabilization Result

## Status: SKIPPED — Module Not Implemented

The `vertical-clinic` module does not exist in the codebase. No patient, appointment, treatment, or medical consent tables, hooks, or components were found. References to "clinic" are limited to business type labels in the B2B portal and AI persona configuration.

Existing scheduling infrastructure (`SchedulingHub`, `useCalendarEvents`) is generic and already has kernel events. The `gdpr_consents` table handles cookie consent only.

**Decision**: Skip for stabilization. Building vertical-clinic requires separate feature scoping (new tables, hooks, UI, kernel events, smoke tests).
