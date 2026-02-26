

# Separar Ficheiros da Equipa + Criar Aba Própria de Ficheiros

## Problema Actual
Os ficheiros estão embebidos dentro da aba "Equipa" como sub-tab. O utilizador quer que a aba "Equipa" tenha apenas notas internas e que exista uma aba dedicada "Ficheiros" nas tabs horizontais.

## Alterações

### 1. Adicionar `'files'` ao `MenuSection` type
- Adicionar `| 'files'` ao tipo `MenuSection` em `src/types/entity.ts`

### 2. Adicionar tab "Ficheiros" em `EntityHorizontalTabs.tsx`
- Adicionar `{ id: 'files', label: 'Ficheiros', showFor: ['lead', 'contact', 'company'] }` ao array `ALL_TABS`, após `'team'`

### 3. Remover sub-tab de ficheiros de `EntityTeamSection.tsx`
- Remover a sub-tab `'files'` — a aba Equipa passa a mostrar apenas as notas internas directamente (sem sub-tabs)
- Remover import de `EntityDocumentsSection` e `EntitySubTabs`

### 4. Renderizar `EntityDocumentsSection` na nova aba em cada detail page
- **`LeadDetailWithSidebar.tsx`**: adicionar `case 'files': return <EntityDocumentsSection ... />`
- **`CompanyDetailWithSidebar.tsx`**: adicionar `case 'files': return <EntityDocumentsSection ... />`
- **`ENIContactDetailWithSidebar.tsx`**: adicionar `case 'files': return <EntityDocumentsSection ... />`

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/types/entity.ts` | Adicionar `'files'` ao `MenuSection` |
| `src/components/entity/EntityHorizontalTabs.tsx` | Nova tab "Ficheiros" |
| `src/components/entity/EntityTeamSection.tsx` | Remover sub-tabs, mostrar só notas |
| `src/components/crm/LeadDetailWithSidebar.tsx` | Render ficheiros na aba `files` |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Render ficheiros na aba `files` |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Render ficheiros na aba `files` |

