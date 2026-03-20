

# Correção da Importação CSV + Enriquecimento IA de Preços de Venda

## Problemas Identificados no CSV

O CSV da Visiotech usa `;` como delimitador **e** tem campos entre aspas que contêm `;` dentro (ex: Description). O parser atual usa `.split(delimiter)` simples, que **quebra os campos quoted**. Além disso:
- Preços têm formato `"421,27 €"` — é preciso remover `€` e espaços
- O `confirmMapping` só mapeia 4 campos (name/description/price/category) — falta brand, cost_price, etc.
- O `createSelectedProducts` não passa brand, direct_cost, specifications ao batch hook

## Alterações

### 1. Parser CSV com suporte a campos quoted

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

Adicionar função `parseCSVLine(line, delimiter)` que respeita aspas:
- Se um campo começa com `"`, acumula até encontrar `"` de fecho
- Suporta `""` como escape de aspas dentro de campos
- Substitui o `.split(delimiter)` no `handleFileUpload` e `handleManualSubmit`

### 2. Expandir `confirmMapping` para todos os campos mapeados

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

Atualmente o bloco `if (!useAi)` só extrai `name`, `description`, `price`, `category`. Expandir para:
- `brand` → `itemData.brand`
- `cost_price` → `itemData.costPrice` (preço do fornecedor)
- `recommended_price` → `itemData.recommendedPrice` (PVP)
- `specifications` → `itemData.specifications`
- `short_description`, `barcode`, `stock`, `weight`, `image_url`, `model`, `color`, `material`, `warranty`

Adicionar limpeza de preços: remover `€`, `$`, espaços, converter `,` → `.`

### 3. Expandir `createSelectedProducts` para passar todos os campos

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

O payload enviado ao batch hook deve incluir:
- `direct_cost` ← preço do CSV (custo do fornecedor)
- `base_price` ← preço de venda (calculado pela IA ou editado manualmente)
- `commercial_description` ← descrição do CSV
- `specifications` ← specs do CSV
- Campos do `rawRow` mapeados: brand (guardar em category ou novo campo)

### 4. IA para sugerir preços de venda

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

Adicionar botão "Enriquecer com IA" no phase `results` que:
- Para cada produto com preço de custo mas sem preço de venda
- Chama `ai-product-assistant` com mode `price-analysis` em batch
- Sugere preço de venda com margem adequada ao tipo de produto
- Preenche `suggestedPrice` e mostra na coluna "Preço (IA)"
- O utilizador pode aceitar ou editar antes de criar

Nova opção no `confirmMapping`: **"Criar com dados CSV + Enriquecer preços com IA"**
- Usa os dados do CSV directamente (nome, categoria, descrição)
- Apenas chama a IA para sugerir preços de venda baseados no custo

### 5. Expandir interface `SKUResult.data`

Adicionar campos em falta à interface:
```text
brand?: string
costPrice?: number
recommendedPrice?: number
barcode?: string
weight?: string
imageUrl?: string
specifications?: Record<string, string>
shortDescription?: string
```

### 6. Adaptar o batch hook

**Ficheiro**: `src/hooks/useProducts.ts`

Garantir que `CreateProductInput` já suporta todos os campos (já suporta — `direct_cost`, `specifications`, `commercial_description`, `short_description` já existem no tipo).

## Fluxo do Utilizador com o CSV da Visiotech

```text
1. Upload CSV → parser detecta ";" e campos quoted
2. Mapping: Reference→SKU, Brand→Marca, Category→Categoria, Description→Descrição, Price→Preço de custo
3. Opções: "Criar directamente" | "Enriquecer preços com IA" | "Enriquecer tudo com IA"
4. Se "Enriquecer preços": IA sugere preço de venda com margem (~30-50%)
5. Preview: utilizador vê custo + preço sugerido, pode editar
6. Criar → batch insert com custo, preço, categoria, marca, descrição
```

## Ficheiros Modificados
- `src/components/products/BatchSKUImportDialog.tsx` — parser quoted CSV, expandir mapping + criação, botão IA preços

