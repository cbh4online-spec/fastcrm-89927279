
# Plano: Corrigir Formulário de Convite de Cliente B2B

## Problemas Identificados

1. **Campos de Associação no Final**: Os campos "Associar a Contacto CRM" e "Associar a Empresa CRM" estão no final do formulário (linhas 360-413) em vez de estarem no início
2. **Sem Auto-preenchimento**: Quando se selecciona um contacto ou empresa existente, os campos do formulário não são preenchidos automaticamente com os dados desse registo
3. **Query de Contactos Limitada**: A query actual só busca `id, name, email` dos contactos, mas precisa de mais campos para o auto-preenchimento (phone, tax_id, address, city, postal_code, country)

## Alterações Necessárias

### 1. Expandir Queries de Dados (src/components/client-users/InviteClientDialog.tsx)

Actualizar as queries para incluir mais campos:

```typescript
// Contactos - adicionar campos: phone, tax_id, address, city, postal_code, country
.select("id, name, email, phone, tax_id, address, city, postal_code, country")

// Empresas - adicionar campos: phone, email, tax_id, address, city, postal_code, country  
.select("id, name, email, phone, tax_id, address, city, postal_code")
```

### 2. Adicionar Funções de Auto-preenchimento

Criar handlers que preenchem os campos quando se selecciona um contacto ou empresa:

```typescript
const handleContactChange = (contactId: string) => {
  const contact = contacts.find(c => c.id === contactId);
  if (contact && contactId !== "none") {
    form.setValue("name", contact.name || form.getValues("name"));
    form.setValue("email", contact.email || form.getValues("email"));
    form.setValue("phone", contact.phone || form.getValues("phone"));
    form.setValue("tax_id", contact.tax_id || form.getValues("tax_id"));
    form.setValue("billing_street", contact.address || form.getValues("billing_street"));
    form.setValue("billing_city", contact.city || form.getValues("billing_city"));
    form.setValue("billing_postal_code", contact.postal_code || form.getValues("billing_postal_code"));
    form.setValue("billing_country", contact.country || form.getValues("billing_country"));
  }
  form.setValue("contact_id", contactId);
};

const handleCompanyChange = (companyId: string) => {
  const company = companies.find(c => c.id === companyId);
  if (company && companyId !== "none") {
    // Preencher se campos estiverem vazios ou usar dados da empresa
    form.setValue("name", form.getValues("name") || company.name);
    form.setValue("email", form.getValues("email") || company.email);
    form.setValue("phone", form.getValues("phone") || company.phone);
    form.setValue("tax_id", company.tax_id || form.getValues("tax_id"));
    form.setValue("billing_street", company.address || form.getValues("billing_street"));
    form.setValue("billing_city", company.city || form.getValues("billing_city"));
    form.setValue("billing_postal_code", company.postal_code || form.getValues("billing_postal_code"));
  }
  form.setValue("company_id", companyId);
};
```

### 3. Reorganizar Estrutura do Formulário

Nova ordem dos campos:

```text
1. CRM Association (NOVO INÍCIO)
   - Associar a Contacto CRM
   - Associar a Empresa CRM
   
2. Basic Info (era o início)
   - Nome *
   - Email *
   - Telefone
   - NIF/NIPC

3. Credit Info
   - Limite de Crédito
   - Condições de Pagamento

4. Billing Address
   - Morada
   - Código Postal
   - Cidade
   - País

5. Notes
   - Notas Internas
```

### 4. Actualizar os Selects para usar os handlers

```typescript
<Select 
  onValueChange={handleContactChange}  // Em vez de field.onChange
  defaultValue={field.value}
>
```

## Fluxo de Utilização Melhorado

1. Utilizador abre o diálogo de convite
2. Pode começar por seleccionar um contacto ou empresa existente
3. Os campos são automaticamente preenchidos com os dados do CRM
4. Utilizador pode ajustar qualquer campo se necessário
5. Submete o formulário

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/client-users/InviteClientDialog.tsx` | Reorganizar campos, expandir queries, adicionar auto-preenchimento |

## Detalhes Técnicos

- As queries de contactos e empresas serão expandidas para incluir todos os campos necessários
- Os handlers `handleContactChange` e `handleCompanyChange` usam `form.setValue()` do react-hook-form
- A lógica de preenchimento prioriza dados do registo seleccionado, mas mantém valores já preenchidos manualmente se preferível
- O bloco de associação CRM será movido para o topo do formulário, antes dos campos básicos
