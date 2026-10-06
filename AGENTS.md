# Architecture rules

- Keep opportunity-stage presentation in the shared `OpportunityStagesStepper` using `IXCard` and the existing advancement callback, so the page and dialog remain consistent without duplicating mutations.- Compute relative renewal/due days with `src/lib/dates/lisbonDays.ts` (Europe/Lisbon calendar days), never hour-based differenceInDays, so 'Hoje/Amanhã' never truncates.
- Decide WhatsApp button state via `src/lib/whatsapp/availability.ts` fed by `useWhatsAppStopSignals` (opt-outs, revoked consents, preferences, fail-closed while loading); it governs assisted communication only, never automatic sends.
- Match WhatsApp opt-outs/consents by `phoneOptOutVariants` (`supabase/functions/_shared/phoneVariants.ts`, mirrored in `src/lib/whatsapp/phoneVariants.ts`, parity-tested) and query only the contact's variants, so client and server agree without exposing the opt-out list.
- Map Stripe subscription state to contracts only via `supabase/functions/_shared/stripeRenewalStatus.ts` and fail the sync result when the contract update errors, so cancellations are never reported as success.
- Read the contact's next task via `fetchContactNextTask` after workspace-instance resolution, with the shared tasks invalidation prefix, so instance changes and task edits cannot leave stale results or hide read failures.
