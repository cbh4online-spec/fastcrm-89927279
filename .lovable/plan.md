

# Adicionar Aba "Relacionamentos" para Empresas e Contactos

## Alterações

### 1. `src/components/entity/EntityHorizontalTabs.tsx`
- Adicionar `{ id: 'relationships', label: 'Relações', showFor: ['contact', 'company'] }` ao array `ALL_TABS`, posicionado antes de `data`

### 2. `src/hooks/useWorkspaceLayoutConfig.ts`
- Adicionar `'relationships'` aos `DEFAULT_SECTIONS` de `contact` e `company`

### 3. `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`
- Importar `RelationshipsPanel` de `@/components/objects/RelationshipsPanel`
- Adicionar `case 'relationships'` no switch com `<RelationshipsPanel recordId={id!} entityType="contact" />`

### 4. `src/components/companies/CompanyDetailWithSidebar.tsx`
- Adicionar `case 'relationships'` como case de nível superior com `<RelationshipsPanel recordId={id!} entityType="company" />`
- Remover a sub-tab `relationships` de dentro do `case 'data'` (já que passa a ser aba própria)

| Ficheiro | Acção |
|----------|-------|
| `EntityHorizontalTabs.tsx` | Adicionar tab `relationships` para contact/company |
| `useWorkspaceLayoutConfig.ts` | Adicionar aos defaults de contact e company |
| `ENIContactDetailWithSidebar.tsx` | Adicionar case `relationships` |
| `CompanyDetailWithSidebar.tsx` | Promover relationships de sub-tab para tab principal |

