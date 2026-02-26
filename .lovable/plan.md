

# Mover Notas para Aba Principal

## Situação Atual
- **Leads e Contactos**: Notas está dentro do separador "Timeline", misturada com a timeline
- **Empresas**: Tem `case 'notes'` no switch mas não aparece como aba horizontal
- `EntityHorizontalTabs` não inclui "Notas" no array `ALL_TABS`

## Alterações

### 1. `src/components/entity/EntityHorizontalTabs.tsx`
- Adicionar `{ id: 'notes', label: 'Notas', showFor: ['lead', 'contact', 'company'] }` ao array `ALL_TABS`, posicionado após "Timeline"

### 2. `src/components/crm/LeadDetailWithSidebar.tsx`
- Remover `<NotesSection>` do `case 'timeline'`
- Adicionar `case 'notes'` dedicado com `<NotesSection entityType="lead" entityId={id!} entityName={lead.name} />`

### 3. `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`
- Remover `<ContactNotesSection>` do `case 'timeline'`
- Adicionar `case 'notes'` dedicado com `<ContactNotesSection contact={contact} onFieldChange={handleFieldChange} />`

### 4. `src/components/companies/CompanyDetailWithSidebar.tsx`
- Já tem `case 'notes'` — sem alteração necessária no switch

| Ficheiro | Acção |
|----------|-------|
| `EntityHorizontalTabs.tsx` | Adicionar 'notes' ao `ALL_TABS` |
| `LeadDetailWithSidebar.tsx` | Separar Notes da Timeline para case próprio |
| `ENIContactDetailWithSidebar.tsx` | Separar Notes da Timeline para case próprio |

