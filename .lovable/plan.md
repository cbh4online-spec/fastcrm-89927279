

# Unificar Notas dos Contactos com Leads/Empresas

## Problema
Os Contactos usam `ContactNotesSection` (simples textarea inline), enquanto Leads e Empresas usam `NotesSection` de `@/components/leads/sections/NotesSection.tsx` — componente rico com notas de voz, anexos, pinning e histórico.

## Alteração

### `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`
- Substituir o import de `ContactNotesSection` pelo `NotesSection` de `@/components/leads/sections/NotesSection.tsx`
- No `case 'notes'`, trocar `<ContactNotesSection contact={contact} onFieldChange={handleFieldChange} />` por `<NotesSection entityType="contact" entityId={id!} entityName={contact.name} />`

| Ficheiro | Acção |
|----------|-------|
| `ENIContactDetailWithSidebar.tsx` | Usar `NotesSection` (rico) em vez de `ContactNotesSection` (simples) |

