
# Pesquisa Automatica de Precos via KuantoKusta e Google Shopping

## Objetivo

Melhorar a edge function `compare-prices` para pesquisar precos especificamente no KuantoKusta e Google Shopping (via Firecrawl), e atualizar automaticamente as colunas `competitor_price_low` e `competitor_source` na tabela `products`.

## O Que Existe Hoje

- Edge function `compare-prices` faz pesquisa generica via Firecrawl com query `"{nome} preco comprar"`
- Resultados guardados em `product_external_prices` (cache 24h)
- Colunas `competitor_price_low` e `competitor_source` existem na tabela `products` mas nao sao preenchidas automaticamente
- Firecrawl API key ja esta configurada como conector

## Alteracoes

### 1. Melhorar a Edge Function `compare-prices`

Fazer duas pesquisas direcionadas via Firecrawl:

| Pesquisa | Query | Site |
|---|---|---|
| KuantoKusta | `site:kuantokusta.pt {nome_produto}` | Comparador de precos PT |
| Google Shopping | `site:google.pt/shopping {nome_produto}` ou `{nome_produto} preco` com scrape do resultado | Agregador global |

Para cada fonte, extrair o preco mais baixo encontrado.

### 2. Atualizar `competitor_price_low` automaticamente

Depois de encontrar precos externos, a edge function atualiza diretamente a tabela `products`:
- `competitor_price_low` = preco mais baixo encontrado entre todas as fontes
- `competitor_source` = nome do site com o preco mais baixo (ex: "KuantoKusta", "Google Shopping", "Worten")

### 3. Botao de acao na tabela de admin

Adicionar um botao "Atualizar Precos" na pagina `StoreProductsAdminPage` que:
- Permite atualizar precos de um produto individual (icone no row)
- Permite atualizar todos os produtos de uma vez (botao no topo)
- Mostra feedback de progresso durante a atualizacao

## Seccao Tecnica

### Ficheiro: `supabase/functions/compare-prices/index.ts`

Refatorar a logica de pesquisa para:

```text
1. Pesquisa KuantoKusta:
   query: "site:kuantokusta.pt {product.name}"
   Extrair precos com regex €X.XX ou X,XX€

2. Pesquisa Google Shopping / geral:
   query: "{product.name} preço comprar portugal"
   Filtrar resultados de lojas conhecidas

3. Combinar resultados, encontrar o preco mais baixo

4. Atualizar products.competitor_price_low e competitor_source

5. Guardar todos os resultados em product_external_prices (cache)
```

A funcao passa a fazer 2 chamadas ao Firecrawl em paralelo (KuantoKusta + geral) e combina os resultados.

### Ficheiro: `src/pages/StoreProductsAdminPage.tsx`

Adicionar:
- Botao "Atualizar Precos" no topo da pagina (junto ao campo de pesquisa)
- Icone de refresh em cada linha da tabela na coluna "Concorrencia"
- Ambos chamam a edge function `compare-prices` e fazem refetch da lista
- Estado de loading individual por produto

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/compare-prices/index.ts` | Adicionar pesquisas KuantoKusta + Google Shopping, atualizar `competitor_price_low` na tabela products |
| `src/pages/StoreProductsAdminPage.tsx` | Adicionar botoes de atualizacao de precos (individual e em massa) |
