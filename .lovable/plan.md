
# Sugestao de Preco de Mercado no Dialogo de Criacao de Produto

## Objetivo

Adicionar um botao de sugestao de preco junto ao campo "Preco" no dialogo de criacao rapida de produto. Este botao pesquisa precos no KuantoKusta e outras fontes (usando a mesma logica da edge function `compare-prices`) e sugere um preco competitivo diretamente no formulario, antes de o produto ser criado.

## O Que Muda

Quando o utilizador tem o preview do produto visivel (apos pesquisa por SKU ou foto), aparece um botao com icone de pesquisa/lampada junto ao campo "Preco". Ao clicar:

1. Pesquisa precos de mercado usando a edge function `firecrawl-search` (KuantoKusta + pesquisa geral)
2. Mostra um mini-resumo com os precos encontrados (fonte + valor)
3. O utilizador pode clicar para aplicar o preco mais baixo ou a media como preco sugerido

## Seccao Tecnica

### Ficheiro: `src/components/store/StoreQuickProductDialog.tsx`

**Novo estado:**
- `marketPrices`: array de `{ source: string, price: number, url: string }` ou null
- `isSearchingPrices`: boolean
- `showPriceSuggestion`: boolean

**Nova funcao `handleSearchMarketPrices`:**
- Invoca `supabase.functions.invoke("firecrawl-search")` com duas queries em paralelo:
  - `site:kuantokusta.pt {productName}`
  - `{productName} preco comprar portugal`
- Extrai precos dos resultados usando regex (mesma logica do `compare-prices`)
- Guarda os resultados em `marketPrices`

**Alteracao no UI (zona do campo Preco):**
- Adicionar um botao pequeno (icone `TrendingUp` ou `Search`) junto ao campo de preco
- Ao clicar, dispara `handleSearchMarketPrices`
- Abaixo do campo de preco, mostra um painel colapsavel com os precos encontrados:
  - Lista com fonte e preco (ex: "KuantoKusta: 9,99 EUR")
  - Botoes "Usar mais baixo (X EUR)" e "Usar media (Y EUR)"
  - Clicar num botao atualiza `preview.price`

A logica de extracao de precos (regex) sera duplicada localmente no componente para processar os resultados do Firecrawl sem depender do `compare-prices` (que requer `productId` ja existente na BD).

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| `src/components/store/StoreQuickProductDialog.tsx` | Adicionar botao de pesquisa de preco de mercado, logica de pesquisa via Firecrawl, e painel de resultados junto ao campo de preco |
