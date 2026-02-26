

# Preview do Resultado do AI Autofill Antes de Guardar

## Abordagem

Criar um dialog de preview que mostra os valores gerados pela IA antes de os guardar. O utilizador pode aceitar/rejeitar cada campo individualmente e confirmar.

## Alterações

### 1. Criar `src/components/custom-fields/AIAutofillPreviewDialog.tsx`

Dialog modal que recebe uma lista de resultados `{ fieldId, fieldName, fieldLabel, generatedValue, isUnique }[]` e permite:
- Ver cada campo com o valor gerado pela IA (com badge "Sugerido por IA")
- Checkbox por campo para aceitar/rejeitar individualmente (todos activos por defeito)
- Botão "Aplicar Seleccionados" que guarda apenas os campos aceites
- Botão "Descartar Todos" para cancelar
- Visual: lista compacta com ícone Sparkles, nome do campo à esquerda, valor gerado à direita

### 2. Editar `src/components/custom-fields/CustomFieldsForm.tsx`

No `runAIAutofill` do `CustomFieldsFormCreate`:
- Em vez de guardar directamente, recolher os resultados num array `{ fieldId, fieldName, value }[]`
- Retornar os resultados (alterar return type de `Promise<void>` para `Promise<AIAutofillResult[]>`)
- O chamador (CreateContactDialog/CreateCompanyDialog) usa o resultado para abrir o preview dialog

Actualizar a interface `CustomFieldsFormCreateRef` para reflectir o novo tipo de retorno.

### 3. Editar `src/components/contacts/EditContactDialog.tsx`

No `handleAIAutofill`:
- Recolher os resultados da IA num array em vez de guardar directamente
- Abrir o `AIAutofillPreviewDialog` com os resultados
- Guardar apenas quando o utilizador confirmar no preview

### 4. Editar `src/components/contacts/CreateContactDialog.tsx`

- Após chamar `runAIAutofill`, receber os resultados e abrir o preview dialog
- Guardar após confirmação do utilizador

### 5. Editar `src/components/companies/CreateCompanyDialog.tsx`

- Mesma lógica do CreateContactDialog para ambos os refs

| Ficheiro | Acção |
|----------|-------|
| `src/components/custom-fields/AIAutofillPreviewDialog.tsx` | Novo — dialog de preview com aceitar/rejeitar por campo |
| `src/components/custom-fields/CustomFieldsForm.tsx` | Alterar `runAIAutofill` para retornar resultados em vez de guardar |
| `src/components/contacts/EditContactDialog.tsx` | Usar preview dialog antes de guardar |
| `src/components/contacts/CreateContactDialog.tsx` | Usar preview dialog após criação |
| `src/components/companies/CreateCompanyDialog.tsx` | Usar preview dialog após criação |

