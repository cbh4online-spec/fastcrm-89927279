# Architecture rules

- Keep opportunity-stage presentation in the shared `OpportunityStagesStepper` using `IXCard` and the existing advancement callback, so the page and dialog remain consistent without duplicating mutations.