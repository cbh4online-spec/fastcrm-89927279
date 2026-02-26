

# Indicador Visual nos Campos Preenchidos por IA

## Abordagem

Adicionar uma coluna `origin` à tabela `custom_field_values` para marcar valores preenchidos por IA. Mostrar um badge/ícone Sparkles nos campos que têm `origin = 'ai'`.

## Alterações

### 1. Migração DB — adicionar coluna `origin` a `custom_field_values`

```sql
ALTER TABLE public.custom_field_values 
ADD COLUMN origin text NOT NULL DEFAULT 'manual';
```

Valores possíveis: `'manual'`, `'ai'`, `'import'`.

### 2. Editar `src/hooks/useCustomFields.ts`

- No `useSetCustomFieldValue`, adicionar parâmetro opcional `origin?: string` (default `'manual'`)
- Incluir `origin` no upsert para `custom_field_values`
- Incluir `origin` no tipo `CustomFieldValue`

### 3. Editar `src/components/contacts/EditContactDialog.tsx`

- No `handleApplyPreview`, passar `origin: 'ai'` ao chamar `setFieldValue.mutateAsync`

### 4. Editar `src/components/contacts/CreateContactDialog.tsx` e `src/components/companies/CreateCompanyDialog.tsx`

- Mesma lógica: passar `origin: 'ai'` ao guardar valores do preview

### 5. Editar `src/components/custom-fields/CustomFieldsForm.tsx`

- No `CustomFieldsForm` (edit mode), ao renderizar cada campo, verificar se o valor tem `origin === 'ai'` (disponível via `existingValues`)
- Mostrar um pequeno badge Sparkles junto ao valor quando `origin === 'ai'`

### 6. Editar `src/components/custom-fields/InlineEditableField.tsx`

- Adicionar prop opcional `isAIGenerated?: boolean`
- Quando `true`, mostrar badge compacto com ícone Sparkles e texto "IA" junto ao valor (na display mode)

### 7. Editar `src/components/objects/InlineFieldEditor.tsx`

- Adicionar prop opcional `isAIGenerated?: boolean`
- Mostrar badge Sparkles quando `true`

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Adicionar coluna `origin` a `custom_field_values` |
| `src/hooks/useCustomFields.ts` | Suportar `origin` no upsert e no tipo |
| `src/components/contacts/EditContactDialog.tsx` | Passar `origin: 'ai'` no apply preview |
| `src/components/contacts/CreateContactDialog.tsx` | Passar `origin: 'ai'` no apply preview |
| `src/components/companies/CreateCompanyDialog.tsx` | Passar `origin: 'ai'` no apply preview |
| `src/components/custom-fields/CustomFieldsForm.tsx` | Propagar `isAIGenerated` aos campos |
| `src/components/custom-fields/InlineEditableField.tsx` | Mostrar badge IA |
| `src/components/objects/InlineFieldEditor.tsx` | Mostrar badge IA |

