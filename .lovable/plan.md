
# Plano: Correção da Lista de Tipos de Produto no Diálogo de Criação/Edição

## Problema Identificado

Os tipos de produto criados nas configurações estão guardados corretamente na base de dados (tabela `product_types`), mas o diálogo de criação/edição de produtos usa valores **hardcoded** em vez de carregar da base de dados.

## Causa Raiz

O ficheiro `CreateProductDialog.tsx` tem opções fixas nos selectores:

```text
Linhas 628-646: Tipos de Produto
┌──────────────────────────────────────────┐
│ <SelectItem value="simple">Simples       │
│ <SelectItem value="formacao">Formação    │  ← HARDCODED
│ <SelectItem value="sessions">Sessões     │
│ ...                                      │
└──────────────────────────────────────────┘

Linhas 656-657: Tipos de Cobrança  
┌──────────────────────────────────────────┐
│ <SelectItem value="one-off">Único        │  ← HARDCODED
│ <SelectItem value="recurring">Recorrente │
└──────────────────────────────────────────┘
```

## Solução

### 1. Atualizar CreateProductDialog.tsx

Importar e usar os hooks dinâmicos:

```typescript
import { useProductTypes, useBillingTypes } from "@/hooks/useProductSettings";

// Dentro do componente:
const { data: productTypesConfig } = useProductTypes();
const { data: billingTypesConfig } = useBillingTypes();
```

Substituir os selectores hardcoded por mapeamento dinâmico:

```typescript
// Antes (hardcoded)
<SelectItem value="simple">Simples</SelectItem>

// Depois (dinâmico)
{productTypesConfig?.filter(t => t.is_active).map(type => (
  <SelectItem key={type.id} value={type.code}>
    {type.label}
  </SelectItem>
))}
```

### 2. Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/products/CreateProductDialog.tsx` | Usar `useProductTypes()` e `useBillingTypes()` nos selects |

### 3. Considerações de Compatibilidade

- Manter o tipo `ProductType` em `types/product.ts` como union type mas flexível
- Os produtos existentes continuarão a funcionar porque os códigos (`simple`, `recurring`, etc.) são os mesmos
- Novos tipos criados aparecerão automaticamente nos selects

## Benefícios

- Tipos de produto criados nas configurações aparecem imediatamente
- Sistema totalmente dinâmico e personalizável por workspace
- Retrocompatível com dados existentes

## Notas Técnicas

O hook `useProductTypes()` já faz seeding automático de valores default quando o workspace não tem tipos configurados, garantindo que nunca haverá uma lista vazia.
