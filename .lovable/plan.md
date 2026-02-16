
# Adicionar hora na data de criacao de Contactos, Leads e Empresas

## Problema

A coluna "Criado Em" nas tabelas de leads, contactos e empresas mostra apenas a data (ex: `16/02/2026`) sem a hora.

## Solucao

Alterar o formato de data em 3 locais para incluir a hora (`HH:mm`):

### 1. `src/components/common/DynamicTableCell.tsx` (linha 21)

Componente partilhado que formata todas as colunas de data nas tabelas dinamicas (leads e contactos usam este).

```
Antes:  format(new Date(dateStr), "dd/MM/yyyy", { locale: pt })
Depois: format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: pt })
```

### 2. `src/components/companies/CompaniesList.tsx` (linha 210)

Tabela de empresas com formatacao propria.

```
Antes:  format(new Date(company.created_at), "dd MMM yyyy", { locale: pt })
Depois: format(new Date(company.created_at), "dd MMM yyyy, HH:mm", { locale: pt })
```

### 3. `src/components/contacts/ContactsList.tsx` (linha 497)

Tabela de contactos com formatacao propria (alem do DynamicTableCell).

```
Antes:  format(new Date(contact.created_at), "dd MMM yyyy", { locale: pt })
Depois: format(new Date(contact.created_at), "dd MMM yyyy, HH:mm", { locale: pt })
```

## Ficheiros a editar

- `src/components/common/DynamicTableCell.tsx`
- `src/components/companies/CompaniesList.tsx`
- `src/components/contacts/ContactsList.tsx`
