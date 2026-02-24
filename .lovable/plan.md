
# Add DealHealthBadge to OpportunityCard (Kanban View)

The `healthMap` (bulk deal intelligence) already exists in `OpportunitiesModule.tsx` but is only passed to the table view. Three files need changes to thread it through to the Kanban cards.

## Changes

### 1. `src/components/opportunities/OpportunityKanbanColumn.tsx`
- Add `healthMap?: Map<string, CompactDealIntelligence>` to props interface
- Pass `healthIntelligence={healthMap?.get(opp.id)}` to each `OpportunityCard`

### 2. `src/components/opportunities/OpportunityCard.tsx`
- Import `DealHealthBadge` and `CompactDealIntelligence`
- Add `healthIntelligence?: CompactDealIntelligence` to props
- Render `<DealHealthBadge intelligence={healthIntelligence} />` after the Deal Score badge (between the score badge and the temperature badge)

### 3. `src/components/opportunities/OpportunitiesModule.tsx`
- Pass `healthMap={healthMap}` to each `<OpportunityKanbanColumn>` (line ~348, alongside `scoresMap`)

## Result
Every Kanban card will show the Healthy/Watch/At Risk badge with tooltip (score + top reason), matching what the table view already displays.
