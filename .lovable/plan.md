
# Informar na Loja se os Precos sao com ou sem IVA

## Objetivo

Adicionar a `store_settings` uma configuracao que define se os precos apresentados na loja incluem ou nao IVA, e mostrar essa informacao de forma clara junto a cada preco e no rodape da loja.

## O Que Muda

### 1. Nova coluna na tabela `store_settings`

| Coluna | Tipo | Default | Descricao |
|---|---|---|---|
| `prices_include_vat` | boolean | true | Se true, os precos mostrados ja incluem IVA. Se false, os precos sao sem IVA |
| `vat_rate` | numeric | 23 | Taxa de IVA em vigor (ex: 23 para 23%) |

### 2. Configuracao no painel de administracao da loja

Na pagina de configuracoes da loja, adicionar uma nova seccao "Fiscalidade / IVA" com:
- Toggle: "Os precos da loja incluem IVA?"
- Campo numerico: "Taxa de IVA em vigor (%)" (default 23%)

### 3. Indicacao junto aos precos na loja publica

Em todos os locais onde o preco e mostrado, adicionar uma pequena indicacao:
- Se precos incluem IVA: mostrar "c/ IVA" junto ao preco
- Se precos nao incluem IVA: mostrar "s/ IVA" ou "+ IVA" junto ao preco

Componentes afetados:
- `StoreProductCard` -- badge junto ao preco
- `StoreQuickViewModal` -- junto ao preco
- `StoreHeroSection` e `StoreHeroCarousel` -- junto ao preco do destaque
- `StoreBestSellers`, `StoreNewArrivals`, `StoreCompatibleProducts`, `StoreBoughtTogether`, `StoreRelatedProducts`, `StoreRecentlyViewed` -- junto ao preco
- `StoreSearchAutocomplete` e `StoreHeader` (resultados de pesquisa)
- `PriceComparisonWidget`

Para evitar alterar cada ficheiro individualmente, sera criado um **componente reutilizavel `StoreVatLabel`** que recebe as settings e mostra o texto correto. Cada componente de preco so precisa de incluir `<StoreVatLabel />` junto ao valor.

### 4. Aviso no rodape da loja

No `StoreFooter`, adicionar uma linha com o texto legal:
- "Todos os precos apresentados incluem IVA a taxa legal em vigor (23%)"
- ou "Todos os precos apresentados nao incluem IVA. Acresce IVA a taxa legal em vigor (23%)"

## Seccao Tecnica

### Migracao SQL

```text
ALTER TABLE store_settings
  ADD COLUMN prices_include_vat boolean NOT NULL DEFAULT true,
  ADD COLUMN vat_rate numeric NOT NULL DEFAULT 23;
```

### Componente novo: `src/components/store/StoreVatLabel.tsx`

Componente simples que recebe `pricesIncludeVat` e `vatRate` e renderiza:
- `pricesIncludeVat = true` -> `<span class="text-[10px] text-muted-foreground">c/ IVA</span>`
- `pricesIncludeVat = false` -> `<span class="text-[10px] text-muted-foreground">+ IVA (23%)</span>`

### Ficheiro: `src/hooks/useStoreSettings.ts`

Adicionar `prices_include_vat` e `vat_rate` a interface `StoreSettings`.

### Ficheiro: `src/components/store/StoreProductCard.tsx`

Importar `StoreVatLabel` e renderizar junto ao preco (depois do valor em euros).

### Ficheiro: `src/components/store/StoreFooter.tsx`

Adicionar texto legal antes do copyright com a indicacao de IVA baseada nas settings.

### Ficheiros com precos a atualizar (adicionar `StoreVatLabel`)

- `StoreProductCard.tsx`
- `StoreQuickViewModal.tsx`
- `StoreHeroSection.tsx`
- `StoreHeroCarousel.tsx`
- `StoreBestSellers.tsx`
- `StoreNewArrivals.tsx`
- `StoreCompatibleProducts.tsx`
- `StoreBoughtTogether.tsx`
- `StoreRelatedProducts.tsx`
- `StoreRecentlyViewed.tsx`
- `StoreSearchAutocomplete.tsx`
- `StoreHeader.tsx`
- `PriceComparisonWidget.tsx`
- `StoreFooter.tsx`

Para minimizar alteracoes, o `StoreVatLabel` lera as settings via um contexto ou prop passado a partir da pagina da loja. A abordagem mais simples sera passar `pricesIncludeVat` e `vatRate` como props ou usar um hook `usePublicStoreSettings` ja existente dentro do componente.

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| Nova migracao SQL | Adicionar `prices_include_vat` e `vat_rate` a `store_settings` |
| `src/hooks/useStoreSettings.ts` | Atualizar interface com novos campos |
| `src/components/store/StoreVatLabel.tsx` | Novo componente reutilizavel |
| `src/components/store/StoreProductCard.tsx` | Adicionar `StoreVatLabel` junto ao preco |
| `src/components/store/StoreQuickViewModal.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/StoreHeroSection.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/StoreHeroCarousel.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/sections/StoreBestSellers.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/sections/StoreNewArrivals.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/sections/StoreCompatibleProducts.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/sections/StoreBoughtTogether.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/sections/StoreRelatedProducts.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/sections/StoreRecentlyViewed.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/StoreSearchAutocomplete.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/StoreHeader.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/PriceComparisonWidget.tsx` | Adicionar `StoreVatLabel` |
| `src/components/store/StoreFooter.tsx` | Adicionar texto legal de IVA |
