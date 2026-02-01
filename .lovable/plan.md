
# Plano: Adicionar Nº Cliente a Contactos e Empresas

## Resumo

Adicionar um campo **"Nº Cliente"** (`client_number`) às tabelas de contactos e empresas, com a seguinte lógica de negócio:

- Quando um contacto pertence a uma empresa, o Nº Cliente do contacto **herda automaticamente** o da empresa
- Quando uma empresa tem contactos, todos partilham o mesmo número
- O número pode ser definido manualmente ou gerado automaticamente

## Alterações Necessárias

### 1. Base de Dados

Adicionar coluna `client_number` às tabelas `contacts` e `companies`:

```sql
-- Adicionar coluna às empresas
ALTER TABLE public.companies 
ADD COLUMN client_number TEXT UNIQUE;

-- Adicionar coluna aos contactos
ALTER TABLE public.contacts 
ADD COLUMN client_number TEXT;

-- Índice para pesquisa rápida
CREATE INDEX idx_companies_client_number ON public.companies(client_number);
CREATE INDEX idx_contacts_client_number ON public.contacts(client_number);
```

### 2. Lógica de Sincronização

Criar trigger para manter o Nº Cliente sincronizado entre contactos e empresa:

```sql
-- Função: Sincronizar client_number quando contacto é associado a empresa
CREATE OR REPLACE FUNCTION sync_contact_client_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o contacto tem company_id, herda o client_number da empresa
  IF NEW.company_id IS NOT NULL THEN
    SELECT client_number INTO NEW.client_number
    FROM companies WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger ao inserir/atualizar contacto
CREATE TRIGGER trigger_sync_contact_client_number
BEFORE INSERT OR UPDATE OF company_id ON contacts
FOR EACH ROW
EXECUTE FUNCTION sync_contact_client_number();

-- Função: Propagar client_number da empresa para todos os seus contactos
CREATE OR REPLACE FUNCTION propagate_company_client_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_number IS DISTINCT FROM OLD.client_number THEN
    UPDATE contacts 
    SET client_number = NEW.client_number
    WHERE company_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger quando empresa atualiza client_number
CREATE TRIGGER trigger_propagate_company_client_number
AFTER UPDATE OF client_number ON companies
FOR EACH ROW
EXECUTE FUNCTION propagate_company_client_number();
```

### 3. Interface - Secção de Identificação das Empresas

Adicionar campo Nº Cliente à `IdentificationSection.tsx`:

```typescript
<InlineEditableField
  label="Nº Cliente"
  fieldId="client_number"
  fieldType="text"
  value={company.client_number}
  onChange={(val) => onFieldChange("client_number", val)}
  icon={<Hash className="w-4 h-4" />}
  placeholder="Ex: CLI-00001"
/>
```

### 4. Interface - Detalhe do Contacto

Mostrar Nº Cliente no `ContactDetail.tsx`:

- Se o contacto **tem empresa associada**: mostrar campo como **somente leitura** com indicação de que vem da empresa
- Se o contacto **não tem empresa**: permitir edição directa

```typescript
<DetailRow
  label="Nº Cliente"
  value={contact.client_number}
  icon={<Hash />}
  isEditing={isEditing && !contact.company_id}
  // Nota visual quando herdado da empresa
  note={contact.company_id ? "Herdado da empresa" : undefined}
/>
```

### 5. Diálogos de Criação

Adicionar campo opcional nos diálogos:

- `CreateCompanyDialog.tsx`: Campo de texto para Nº Cliente
- `CreateContactDialog.tsx`: Campo de texto (desactivado se empresa seleccionada)
- `EditContactDialog.tsx` / `EditCompanyDialog.tsx`: Mesmo comportamento

### 6. Hooks

Actualizar interfaces nos hooks:

**`useCompanies.ts`**:
```typescript
interface Company {
  // ... campos existentes
  client_number: string | null;
}

interface CreateCompanyData {
  // ... campos existentes
  client_number?: string;
}
```

**`useContacts.ts`**:
```typescript
interface Contact {
  // ... campos existentes  
  client_number: string | null;
}
```

### 7. Tabelas/Listagens

Adicionar coluna "Nº Cliente" às tabelas:

- `SmartContactsTable.tsx`
- `SmartCompaniesTable.tsx`

## Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────┐
│  EMPRESA "Acme Lda"                                         │
│  client_number: "CLI-00042"                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ (propaga automaticamente)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  CONTACTO "João Silva"                                      │
│  company_id: → Acme Lda                                     │
│  client_number: "CLI-00042" (herdado, read-only)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CONTACTO "Maria Costa" (sem empresa)                       │
│  company_id: NULL                                           │
│  client_number: "CLI-00099" (editável directamente)         │
└─────────────────────────────────────────────────────────────┘
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| **Base de dados** | Migração SQL para adicionar colunas e triggers |
| `src/hooks/useCompanies.ts` | Adicionar `client_number` às interfaces |
| `src/hooks/useContacts.ts` | Adicionar `client_number` à interface |
| `src/components/companies/sections/IdentificationSection.tsx` | Adicionar campo Nº Cliente |
| `src/components/companies/CreateCompanyDialog.tsx` | Adicionar campo no formulário |
| `src/components/companies/EditCompanyDialog.tsx` | Adicionar campo no formulário |
| `src/components/contacts/ContactDetail.tsx` | Mostrar Nº Cliente |
| `src/components/contacts/CreateContactDialog.tsx` | Adicionar campo (condicional) |
| `src/components/contacts/EditContactDialog.tsx` | Adicionar campo (condicional) |
| `src/components/contacts/SmartContactsTable.tsx` | Adicionar coluna |
| `src/components/companies/SmartCompaniesTable.tsx` | Adicionar coluna |

## Resultado Esperado

1. Campo "Nº Cliente" visível em empresas e contactos
2. Quando contacto pertence a empresa, herda automaticamente o número
3. Alterações no Nº Cliente da empresa propagam para todos os contactos
4. Contactos sem empresa podem ter Nº Cliente próprio
5. Campo pesquisável e visível nas listagens
