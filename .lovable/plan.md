

# Adicionar Data de Aniversário a Contactos, Leads e Empresas

## 1. Migração de Base de Dados

Adicionar coluna `birth_date` (tipo `DATE`, nullable) às 3 tabelas:

```sql
ALTER TABLE public.contacts ADD COLUMN birth_date DATE;
ALTER TABLE public.leads ADD COLUMN birth_date DATE;
ALTER TABLE public.companies ADD COLUMN founding_date_anniversary DATE;
```

Nota: `leads` já tem `founding_date` — para empresas usamos `founding_date_anniversary` como data de aniversário da empresa. Para leads e contactos usamos `birth_date`.

**Alternativa**: usar `birth_date` nas 3 tabelas com label diferente no UI ("Data de Aniversário" para empresas, "Data de Nascimento" para contactos/leads).

## 2. Secções de Identificação — UI

### `src/components/contacts/eni/sections/IdentificationSection.tsx`
- Adicionar campo `InlineEditableField` com `fieldType="date"` para `birth_date`, com ícone `Cake` e label "Data de Nascimento"

### `src/components/leads/sections/IdentificationSection.tsx`
- Adicionar campo `InlineEditableField` com `fieldType="date"` para `birth_date`, com ícone `Cake` e label "Data de Nascimento"

### `src/components/companies/sections/IdentificationSection.tsx`
- Adicionar campo `InlineEditableField` com `fieldType="date"` para `birth_date`, com ícone `Cake` e label "Data de Aniversário"

## 3. Tipos TypeScript

### `src/components/contacts/eni/ENIContactTypes.ts`
- Adicionar `birth_date?: string | null` à interface `ENIContact`

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Adicionar `birth_date DATE` a contacts, leads, companies |
| `ENIContactTypes.ts` | Adicionar campo `birth_date` |
| `contacts/eni/sections/IdentificationSection.tsx` | Adicionar campo data nascimento |
| `leads/sections/IdentificationSection.tsx` | Adicionar campo data nascimento |
| `companies/sections/IdentificationSection.tsx` | Adicionar campo data aniversário |

