

# Editar valores sugeridos pela IA no Preview

## Abordagem

Adicionar estado local `editedValues` ao `AIAutofillPreviewDialog` para permitir edição inline de cada valor. Ao confirmar, usar os valores editados em vez dos originais.

## Alterações

### 1. Editar `src/components/custom-fields/AIAutofillPreviewDialog.tsx`

- Adicionar estado `editedValues: Record<string, string>` inicializado com os `generatedValue` dos resultados
- Substituir o `<p>` de display por um `<Input>` ou `<Textarea>` editável por campo
- Adicionar ícone `Pencil` para indicar que é editável
- No `handleConfirm`, mapear os resultados seleccionados com os valores editados (`editedValues[fieldId]`)
- Actualizar a descrição do dialog para mencionar que os valores podem ser editados

| Ficheiro | Acção |
|----------|-------|
| `src/components/custom-fields/AIAutofillPreviewDialog.tsx` | Adicionar edição inline dos valores sugeridos |

