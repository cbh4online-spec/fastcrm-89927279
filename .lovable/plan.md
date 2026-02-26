

# Integrar AI Autofill nos Formulários de Criação de Contactos/Empresas

## Abordagem

Após criar um contacto/empresa e guardar os campos personalizados, o sistema verifica quais campos têm `ai_autofill_enabled: true` no `formatting_config` e invoca automaticamente a edge function para preencher esses campos com IA. O processo é assíncrono e mostra feedback ao utilizador.

## Alterações

### 1. Editar `src/components/custom-fields/CustomFieldsForm.tsx`

No componente `CustomFieldsFormCreate`:
- Importar `useManagedFields` para aceder ao `formatting_config` dos campos (o hook `useCustomFields` não inclui `formatting_config`)
- Adicionar método `runAIAutofill(entityId, recordData)` ao `useImperativeHandle` exposto via ref
- Este método:
  - Filtra campos com `formatting_config.ai_autofill_enabled === true`
  - Para cada campo, chama o hook `useAIAutofillField` com o `record_data` do registo
  - Guarda o valor gerado via `setFieldValue`
  - Mostra toast de progresso/sucesso

### 2. Editar `src/components/contacts/CreateContactDialog.tsx`

Após `customFieldsRef.current.saveCustomFields(result.id)`:
- Chamar `customFieldsRef.current.runAIAutofill(result.id, formData)` para preencher campos com IA
- O `formData` (name, email, phone, company, etc.) serve como `record_data` para contexto da IA

### 3. Editar `src/components/companies/CreateCompanyDialog.tsx`

Mesma lógica: após guardar custom fields dos dois refs (primary + secondary), invocar `runAIAutofill` em ambos.

### 4. Editar `src/components/contacts/EditContactDialog.tsx`

Adicionar botão "Preencher com IA" (ícone Sparkles) que dispara o AI autofill para campos configurados, usando os dados actuais do contacto como contexto.

| Ficheiro | Acção |
|----------|-------|
| `src/components/custom-fields/CustomFieldsForm.tsx` | Adicionar método `runAIAutofill` ao ref do `CustomFieldsFormCreate` |
| `src/components/contacts/CreateContactDialog.tsx` | Chamar AI autofill após criar contacto |
| `src/components/companies/CreateCompanyDialog.tsx` | Chamar AI autofill após criar empresa |
| `src/components/contacts/EditContactDialog.tsx` | Botão para AI autofill manual |

