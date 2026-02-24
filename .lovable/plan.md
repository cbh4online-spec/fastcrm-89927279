

# Command Palette Enhancement — Index Nav V2 + Legacy Routes

## Current State

`GlobalSearch.tsx` already exists and handles Cmd+K. It:
- Searches CRM records (leads, contacts, companies, opportunities)
- Has a hardcoded "Navegação Rápida" section with 5 static items
- Does NOT index `nav.v2.ts` items (Home, Objects, Inbox, Automations, Intelligence, Reports, Marketplace, Settings)
- Does NOT index `routes.legacy.ts` (50+ hidden legacy routes)

The `nav.v2.ts` config has icons via lucide imports. The `routes.legacy.ts` has path + label pairs.

## Plan

### Single file edit: `src/components/layout/GlobalSearch.tsx`

Add a new "Pages" command group that combines both sources, appearing above the CRM record results:

1. **Import** `NAV_V2_ITEMS` from `@/config/nav.v2.ts` and `LEGACY_ROUTES` from `@/config/routes.legacy.ts`

2. **Build a unified pages list** by merging:
   - `NAV_V2_ITEMS` mapped to `{ path: item.href, label: item.name, icon: item.icon, source: "nav" }`
   - `LEGACY_ROUTES` mapped to `{ path: item.path, label: item.label, icon: null, source: "legacy" }`

3. **Filter pages by search query** using `useMemo` — match against label (case-insensitive). Show all nav items + first 5 legacy when no search; when searching, filter both and show up to 10 matches.

4. **Render a "Páginas" CommandGroup** before the CRM record groups, with each page as a `CommandItem` that navigates on select. Nav items use their lucide icon; legacy items use a generic `FileText` or `ArrowRight` icon.

5. **Remove the hardcoded "Navegação Rápida" section** at the bottom — it's superseded by the new Pages group.

6. **Update placeholder text** to mention pages: `"Pesquisar páginas, leads, contactos, empresas..."`.

### Technical Details

- No new files needed — single edit to `GlobalSearch.tsx`
- No database changes
- The `cmdk` library handles fuzzy matching natively via its `value` prop, so we set `value` to `"page-{label}"` for natural filtering
- Icons from `nav.v2.ts` are already lucide components; render them directly with `<item.icon className="mr-2 h-4 w-4" />`
- Legacy routes get a subtle `Badge` with "Legacy" to distinguish them visually (optional, can skip for cleanliness)

### Result

Pressing Cmd+K shows:
1. **Páginas** — Home, Objects, Inbox, Automations, Intelligence, Reports, Marketplace, Settings, then legacy routes matching the query
2. **Leads** — CRM record matches
3. **Contactos** — CRM record matches
4. **Empresas** — CRM record matches
5. **Oportunidades** — CRM record matches

