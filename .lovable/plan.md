

# Plan: Add Missing i18n Keys to ES and FR for Opportunity Detail Page

## Current State

The Attio-style opportunity detail page is already fully implemented in code -- header with close/nav, tabs with dots and badges, highlights cards with widgets, collapsible sidebar, dynamic tabs dropdown, activity timeline, notes/tasks tabs, and header actions.

However, **Spanish (ES) and French (FR) locales are missing ~30 keys** that were added to PT and EN during the previous implementation rounds. This causes fallback to English or missing text in those languages.

## Missing Keys in ES and FR

The following keys exist in PT/EN but are absent from ES/FR:

| Key | ES Translation | FR Translation |
|---|---|---|
| `oppDetail_composeEmail` | Redactar email | Rédiger un email |
| `oppDetail_favorite` | Favorito | Favori |
| `oppDetail_unfavorite` | Quitar favorito | Retirer des favoris |
| `oppDetail_associatedCompanyTab` | Empresa | Entreprise |
| `oppDetail_associatedPeopleTab` | Contactos | Contacts |
| `oppDetail_callsTab` | Llamadas | Appels |
| `oppDetail_showAllValues` | Mostrar todos los valores > | Afficher toutes les valeurs > |
| `oppDetail_hideValues` | < Ocultar valores | < Masquer les valeurs |
| `oppDetail_priorityLevel` | Nivel de Prioridad | Niveau de Priorité |
| `oppDetail_listsSection` | Listas | Listes |
| `oppDetail_addToList` | Añadir a lista | Ajouter à une liste |
| `oppDetail_addToListSoon` | Funcionalidad próximamente | Fonctionnalité bientôt disponible |
| `oppDetail_noLists` | Este registro no se ha añadido a ninguna lista | Cet enregistrement n'a été ajouté à aucune liste |
| `oppDetail_noDealValue` | Sin valor asignado | Aucune valeur attribuée |
| `oppDetail_viewAll` | Ver todo | Tout voir |
| `oppDetail_allActivity` | Toda la actividad | Toute l'activité |
| `oppDetail_noActivity` | Sin actividades registradas | Aucune activité enregistrée |
| `oppDetail_noAssociatedCompany` | Sin empresa asociada | Aucune entreprise associée |
| `oppDetail_noAssociatedPeople` | Sin contactos asociados | Aucun contact associé |
| `oppDetail_noCalls` | Sin llamadas registradas | Aucun appel enregistré |
| `oppDetail_logCall` | Registrar llamada | Enregistrer un appel |
| `oppDetail_logCallSoon` | Funcionalidad próximamente | Fonctionnalité bientôt disponible |
| `oppDetail_currency` | Moneda | Devise |
| `oppDetail_addTab` | + Añadir tab | + Ajouter un onglet |
| `oppDetail_addTabSoon` | Tabs personalizadas próximamente | Onglets personnalisés bientôt |
| `oppDetail_addWidget` | + Añadir widget | + Ajouter un widget |
| `oppDetail_addWidgetSoon` | Widgets personalizados próximamente | Widgets personnalisés bientôt |
| `oppDetail_documents` | Documentos | Documents |
| `oppDetail_noDocuments` | Sin documentos | Aucun document |
| `oppDetail_addSection` | + Añadir sección | + Ajouter une section |
| `oppDetail_addSectionSoon` | Secciones personalizadas próximamente | Sections personnalisées bientôt |
| `oppDetail_copyTitle` | Título copiado | Titre copié |
| `oppDetail_copiedTitle` | Título copiado al portapapeles | Titre copié dans le presse-papiers |
| `oppDetail_shareRecord` | Compartir registro | Partager l'enregistrement |
| `oppDetail_expandView` | Expandir vista | Agrandir la vue |
| `oppDetail_expandViewSoon` | Vista expandida próximamente | Vue agrandie bientôt disponible |
| `oppDetail_companyDomains` | Dominios | Domaines |
| `oppDetail_companyCategories` | Categorías | Catégories |
| `oppDetail_companyICP` | ICP | ICP |
| `oppDetail_billingAdmin` | Admin de facturación | Admin facturation |
| `oppDetail_workspace` | Workspace | Espace de travail |
| `oppDetail_keyContact` | Contacto clave | Contact clé |
| `oppDetail_partner` | Partner | Partenaire |
| `oppDetail_noRecordAssociated` | Ningún {{type}} asociado | Aucun {{type}} associé |
| `oppDetail_associate` | + Asociar | + Associer |

Also missing from ES/FR but present in PT/EN (sidebar-related keys added in later rounds):

| Key | ES | FR |
|---|---|---|
| Various `sidebar*`, `filterPill*`, `viewSettings*`, `importExport*`, `tableRowCount`, `addColumn`, `addCalculation` keys | Need Spanish translations | Need French translations |

## Files to Edit

| File | Action | Description |
|---|---|---|
| `src/i18n/locales/es/crm.json` | **EDIT** | Add ~44 missing keys with Spanish translations |
| `src/i18n/locales/fr/crm.json` | **EDIT** | Add ~44 missing keys with French translations |

## Implementation

1. Add all missing `oppDetail_*` keys to `es/crm.json` (inserted after line 600, before `companyTypeProspect`)
2. Add all missing `oppDetail_*` keys to `fr/crm.json` (inserted after line 600, before `companyTypeProspect`)
3. Add missing sidebar/table keys that PT has but ES/FR don't (e.g. `sidebarDuplicate`, `sidebarNoLists`, `filterPillAdd`, `sortedBy`, `viewSettings*`, `importExport`, `exportExcel`, `tableRowCount`, `addColumn`, `addCalculation`, `sidebarNotifications`, `sidebarNotes`, `sidebarEmails`, `sidebarCalls`, `sidebarReports`, `sidebarAutomations`, `sidebarSequences`, `sidebarWorkflows`, `quickActions`, `inviteTeamMembers`, `sidebarUsers`, `sidebarWorkspaces`, `sidebarPartners`, `commandPaletteSearch`, `navigation`)

No component changes needed -- all UI code is already implemented.

