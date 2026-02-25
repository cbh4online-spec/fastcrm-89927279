

# Plan: Template Library Modal (Attio-style)

## What We're Building

A full-screen modal template library matching the Attio/Basepoint pattern shown in the screenshot. This will be a reusable dialog that can be opened from the existing Communication Templates page (and other surfaces) to browse, search, and apply pre-built templates organized by use case categories.

## Key UI Elements (from screenshot)

- **Left sidebar**: "USE CASES" vertical nav with category icons (General, Sales, Success, Product, Marketing, Recruiting, Fundraising, Investing)
- **Search bar**: "Search for templates, topics, goals..." at the top
- **Template cards**: Horizontal list items showing:
  - Left: Field preview chips (e.g. "Budget > Text", "Authority > List")
  - Center: Template name, description, category badge
  - Right: Section count (e.g. "4 Sections")
- **Preview button**: "Preview template" sticky at bottom-right
- **Close button**: X in top-right corner

## Architecture

### New Components

1. **`src/components/communication/TemplateLibraryDialog.tsx`** — Main modal dialog
   - Left sidebar with category list + icons
   - Search input at top
   - Scrollable template card list
   - Preview panel/button
   - Props: `open`, `onOpenChange`, `onSelectTemplate`

2. **`src/components/communication/TemplateLibraryCard.tsx`** — Individual template row card
   - Field preview chips on the left
   - Title + description + category badge in center
   - Section/field count on right
   - Hover state with selection

3. **`src/components/communication/templateLibraryData.ts`** — Static pre-built template definitions
   - ~15-20 pre-built templates organized by use case
   - Categories: Geral, Vendas, Sucesso, Produto, Marketing, Recrutamento, Captação, Investimento
   - Each template has: name, description, category, fields/sections, body content

### Integration Points

- Add "Biblioteca" button to existing `TemplatesListPage.tsx` header actions
- When a template is selected from the library, it pre-fills the `TemplateFormDialog` for creation
- Reuses existing `CommunicationTemplate` type and `useCreateCommunicationTemplate` hook

## Use Case Categories (adapted for CRM context)

| Category | Icon | Templates |
|----------|------|-----------|
| Geral | LayoutGrid | Boas-vindas, Agradecimento, Confirmação |
| Vendas | TrendingUp | BANT, Cold Outreach, Follow-Up, Proposta |
| Sucesso | Heart | Onboarding, Check-in, Satisfação, Renovação |
| Produto | Package | Lançamento, Demo, Feature Update |
| Marketing | Megaphone | Newsletter, Promoção, Evento, Reativação |
| Recrutamento | Users | Entrevista, Candidato, Oferta |

## Pre-built Templates (examples)

Each template includes:
- **Name** and **description** 
- **Category** badge (colored)
- **Fields/sections** with type indicators (Text, List, etc.)
- **Channel** (email/whatsapp)
- **Structure** (AIDA, PAS, etc.)
- **Body** content with variables

Example:
```text
BANT Qualification
├── Budget      > Text
├── Authority   > Text  
├── Need        > List
└── Timeline    > Text
Category: Sales | 4 Sections
```

## Implementation Steps

### Step 1: Create template library data file
`src/components/communication/templateLibraryData.ts` with ~18 pre-built templates, each with name, description, category, sections (field previews), channel, tone, structure, and body content.

### Step 2: Create TemplateLibraryCard component
Horizontal card matching the screenshot layout: field chips on left, title+description+badge in center, section count on right.

### Step 3: Create TemplateLibraryDialog component
Full modal with:
- Left sidebar (240px) with category list and active state
- Top search bar
- Scrollable card list
- Bottom "Preview template" button that shows a preview of selected template
- "Use template" action that passes data to `TemplateFormDialog`

### Step 4: Integrate into TemplatesListPage
Add a "Biblioteca" button to the page header that opens the dialog. On template selection, open `TemplateFormDialog` pre-filled with the template data.

## Technical Notes

- The dialog uses `@radix-ui/react-dialog` (already installed) with `max-w-5xl` for the wide layout
- Categories filter client-side from the static data array
- Search filters by name, description, and field names
- No database changes needed — this is a static library of starter templates
- When "Use template" is clicked, the template body/structure is passed to the existing create flow

