

# Attio-Style Entity Detail Layout

## What Changes

The current 3-column layout (left sidebar menu → center content → right context sidebar) will be replaced with the Attio-style layout from the screenshot:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [←] Entity Name ★                          [Run workflow] [⚙] [⋯] │
├──────────────────────────────────────┬──────────────────────────────┤
│ Overview | Activity | Emails 3 |     │ Details | Comments           │
│ Notes 5 | Team 2 | Tasks 1 | Files  │                              │
│ +2 more ▾                            │ ▸ Record Details             │
├──────────────────────────────────────┤   Domains: cosme.pt          │
│                                      │   Description: ...           │
│ ═ Highlights                         │   Categories: Finance SaaS   │
│ ┌──────┐ ┌──────┐ ┌──────┐          │                              │
│ │Conn. │ │Deals │ │Last  │          │ ▸ Enriched Firmographics     │
│ │Stren.│ │      │ │Inter.│          │   Founded: 2022              │
│ └──────┘ └──────┘ └──────┘          │   Employees: 51-250          │
│ ┌──────┐ ┌──────┐ ┌──────┐          │   Est ARR: $1M-$10M          │
│ │ ICP  │ │Categ.│ │Worksp│          │   Funding: $10M              │
│ └──────┘ └──────┘ └──────┘          │                              │
│                                      │ ▸ Location                   │
│ ← Activity                          │   City: Porto                │
│   • Meeting attended 2h ago          │   Country: Portugal          │
│   • 3 attributes changed 4d ago     │                              │
│                                      │ ▸ Social Media Links         │
│ ✉ Emails 3                      [+] │   LinkedIn: ...              │
│   • Subject line preview...          │   Facebook: ...              │
│                                      │   Twitter: ...               │
│ 📝 Notes 5                      [+] │                              │
│   • Note preview...                  │ ▸ Lists                      │
│                                      │                              │
│ ☐ Tasks 1                       [+] │                              │
│   • Task name        @user  📅 date │                              │
└──────────────────────────────────────┴──────────────────────────────┘
```

## Architecture

### 1. New shared component: `EntityHorizontalTabs`

Replaces `EntitySidebarMenu`. Renders horizontal tabs with counts, overflow handling ("+2 more" dropdown), and section navigation. Used by all 3 entity types.

### 2. New shared component: `EntityDetailsPanel`

Right sidebar with collapsible sections showing record fields inline (not cards). Adapts per entity type:
- **Company**: Record Details (domain, description, categories), Firmographics (founded, employees, ARR, funding), Location (city, state, country), Social Media
- **Contact**: Record Details (email, phone, company, job title), Professional Profile, Address, Social Media
- **Lead**: Record Details (email, phone, source), Tags, Social Media

### 3. New shared component: `EntityHighlightsGrid`

The "Highlights" card grid at top of Overview showing key metrics (Connection strength, Associated deals, Last interaction, ICP score, Categories, Associated workspaces). Each card is a small summary box.

### 4. Overview section redesign

The Overview tab becomes a single scrollable page with embedded preview sections:
- **Highlights** grid (top)
- **Activity** (last 3 entries + "View all →")
- **Emails** (last 3 + count badge + "+" button)
- **Notes** (last 3 + count badge + "+" button)
- **Tasks** (active tasks + "+" button)

Clicking "View all →" or the tab switches to that full section.

### 5. Update all 3 detail pages

- `CompanyDetailWithSidebar.tsx` — replace left sidebar + center with horizontal tabs + main + right details panel
- `LeadDetailWithSidebar.tsx` — same layout transformation
- `ENIContactDetailWithSidebar.tsx` — same layout transformation

### 6. Header simplification

Simplified header matching screenshot: icon + name + star (favorite). Action buttons on the right. Remove gradient background, use flat border-b style.

## Files Changed

| File | Change |
|------|--------|
| `src/components/entity/EntityHorizontalTabs.tsx` | **New** — horizontal tab bar with counts and overflow |
| `src/components/entity/EntityDetailsPanel.tsx` | **New** — right sidebar with collapsible record details |
| `src/components/entity/EntityHighlightsGrid.tsx` | **New** — highlights card grid for overview |
| `src/components/entity/EntityOverviewSections.tsx` | **New** — inline Activity/Emails/Notes/Tasks previews |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Replace 3-col with tabs + details panel layout |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Replace 3-col with tabs + details panel layout |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Replace 3-col with tabs + details panel layout |

## What Stays

- All existing section content components (IdentificationSection, FinancialSection, NotesSection, etc.) remain unchanged — only the container layout changes
- `EntitySidebarMenu` and `EntityContextSidebar` remain in codebase (not deleted) but are no longer used by the 3 detail pages
- All hooks, data fetching, and business logic untouched

