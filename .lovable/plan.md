

# Remove Duplicate Fields from Lead Detail Page

## Problem

The Lead detail page shows the same fields in multiple places:

1. **Overview tab → IdentificationSection**: Nome, Email, Telefone, Origem, Estado
2. **Right sidebar → EntityDetailsPanel**: Email, Telefone, Fonte (=Origem), Empresa
3. **Details tab → SocialMediaSection**: LinkedIn, Instagram, Facebook, Twitter
4. **Right sidebar → EntityDetailsPanel**: LinkedIn, Instagram (under "Redes Sociais")

Email, Telefone, and Origem/Fonte appear in both the main content and the sidebar. Social links appear in both the Details tab and the sidebar.

## Solution

Since the right sidebar (`EntityDetailsPanel`) is always visible and now supports inline editing, the main content sections should not repeat those fields. The sidebar is the canonical place for contact data and social links.

### Changes

**1. `src/components/leads/sections/IdentificationSection.tsx`**
- Remove Email, Telefone, and Origem fields (keep only Nome and Estado, which are not in the sidebar or serve a different purpose as the primary identification)
- Actually, since Nome is the page title and Estado is shown as a badge in the header AND in the sidebar... the entire IdentificationSection becomes redundant.
- **Remove the `IdentificationSection` from the Overview tab entirely** — all its fields are already editable in the sidebar or header.

**2. `src/components/crm/LeadDetailWithSidebar.tsx`**
- In the `overview` case (line 201): Remove `<IdentificationSection lead={lead} onFieldChange={handleFieldChange} />`
- In the `details` case (line 253): Remove `<SocialMediaSection lead={lead} onFieldChange={handleFieldChange} />` since LinkedIn, Instagram, Facebook, Twitter are all editable in the sidebar's "Redes Sociais" section.

**3. `src/components/entity/EntityDetailsPanel.tsx` → `LeadDetails`**
- Add the missing fields that were only in `IdentificationSection` / `SocialMediaSection` but not yet in the sidebar:
  - Add `Empresa` field (already present)
  - Add `Facebook` and `Twitter` to "Redes Sociais" (currently only LinkedIn and Instagram are shown)
- This ensures no data is lost when we remove the main-content sections.

### Summary of Field Locations After Fix

| Field | Location |
|-------|----------|
| Nome | Header (page title) |
| Status/Estado | Header badge + LeadLifecycleSection |
| Email | Sidebar "Dados do Lead" |
| Telefone | Sidebar "Dados do Lead" |
| Fonte/Origem | Sidebar "Dados do Lead" |
| Empresa | Sidebar "Dados do Lead" |
| LinkedIn | Sidebar "Redes Sociais" |
| Instagram | Sidebar "Redes Sociais" |
| Facebook | Sidebar "Redes Sociais" (NEW) |
| Twitter | Sidebar "Redes Sociais" (NEW) |
| Tags | Sidebar "Dados do Lead" + Details tab TagsSection |

### Files Modified

| File | Change |
|------|--------|
| `src/components/crm/LeadDetailWithSidebar.tsx` | Remove `IdentificationSection` from overview; remove `SocialMediaSection` from details |
| `src/components/entity/EntityDetailsPanel.tsx` | Add Facebook + Twitter to LeadDetails "Redes Sociais" section |

