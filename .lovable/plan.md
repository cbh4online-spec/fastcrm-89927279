

# Prevenir NIF e Email duplicados

## Abordagem

Adicionar validação **a nível de base de dados** (unique constraints) e **a nível de aplicação** (verificação antes de guardar com mensagem de erro clara) para as 3 tabelas: `contacts`, `companies` e `leads`.

## Passo 1: Migração DB — Unique Constraints parciais

Criar unique indexes parciais (ignorando NULLs, strings vazias e registos soft-deleted):

```sql
-- Contacts
CREATE UNIQUE INDEX idx_contacts_email_unique 
  ON contacts (workspace_id, email) 
  WHERE email IS NOT NULL AND email != '' AND deleted_at IS NULL;

CREATE UNIQUE INDEX idx_contacts_tax_id_unique 
  ON contacts (workspace_id, tax_id) 
  WHERE tax_id IS NOT NULL AND tax_id != '' AND deleted_at IS NULL;

-- Companies
CREATE UNIQUE INDEX idx_companies_email_unique 
  ON companies (workspace_id, email) 
  WHERE email IS NOT NULL AND email != '' AND deleted_at IS NULL;

CREATE UNIQUE INDEX idx_companies_tax_id_unique 
  ON companies (workspace_id, tax_id) 
  WHERE tax_id IS NOT NULL AND tax_id != '' AND deleted_at IS NULL;

-- Leads
CREATE UNIQUE INDEX idx_leads_email_unique 
  ON leads (workspace_id, email) 
  WHERE email IS NOT NULL AND email != '' AND deleted_at IS NULL;
```

Nota: Leads não têm `tax_id`, portanto só email.

## Passo 2: Mensagens de erro amigáveis nos hooks

### `useContacts.ts`
- No `createContact` e `updateContact`, capturar erro de constraint violation (código Postgres `23505`) e mostrar toast específico: "Já existe um contacto com este email/NIF neste workspace."

### `useCompanies.ts`
- Idem para `createCompany` e `updateCompany`.

### `useLeads.ts`
- Idem para `createLead` e `updateLead` (só email).

## Passo 3: Validação preventiva inline (opcional, melhor UX)

### `InlineEditableField` / `InlineNifField`
- Nos componentes de edição inline dos campos `email` e `tax_id`, antes de chamar `onChange`, fazer uma query rápida para verificar se o valor já existe noutro registo do mesmo workspace.
- Se duplicado, mostrar toast de aviso e não guardar.

Isto será implementado nos handlers `onFieldChange` dos detail pages (`ENIContactDetailWithSidebar.tsx`, `CompanyDetailWithSidebar.tsx`) para os campos `email` e `tax_id`.

## Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| Migração SQL | Unique indexes parciais |
| `src/hooks/useContacts.ts` | Error handling para `23505` |
| `src/hooks/useCompanies.ts` | Error handling para `23505` |
| `src/hooks/useLeads.ts` | Error handling para `23505` |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Validação preventiva em `handleFieldChange` |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Validação preventiva em `handleFieldChange` |

