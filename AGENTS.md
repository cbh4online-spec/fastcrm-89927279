# Architecture rules

- Keep opportunity-stage presentation in the shared `OpportunityStagesStepper` using `IXCard` and the existing advancement callback, so the page and dialog remain consistent without duplicating mutations.- Compute relative renewal/due days with `src/lib/dates/lisbonDays.ts` (Europe/Lisbon calendar days), never hour-based differenceInDays, so 'Hoje/Amanhã' never truncates.
- Decide WhatsApp button state via `src/lib/whatsapp/availability.ts`; has_whatsapp=false means unconfirmed, not unavailable.
