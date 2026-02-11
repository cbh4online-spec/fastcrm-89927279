

# FastCRM - Criacao de Produto Ultra-Rapida

## Problema Atual

O fluxo de criacao de produto tem varios pontos de lentidao:

1. **Pesquisa SKU sequencial**: 4 queries Firecrawl executadas uma a uma, mais pesquisa de logo de marca -- tudo sequencial
2. **Pesquisa de precos de mercado e um passo separado**: o utilizador tem de clicar manualmente num botao extra apos ja ter o preview
3. **Duplo clique necessario**: primeiro pesquisa, depois precos, depois criar -- 3 acoes manuais
4. **Sem auto-submit**: o utilizador tem de rever tudo manualmente mesmo quando os dados da IA sao bons

## Solucao: Fluxo "Fast Mode"

### 1. Pesquisa de precos de mercado automatica (em paralelo com SKU)

Quando a pesquisa por SKU ou foto devolve resultados, disparar **automaticamente** a pesquisa de precos de mercado em paralelo, sem esperar pelo clique do utilizador. Quando o preview aparece, os precos de mercado ja estao a caminho ou ja chegaram.

### 2. Queries Firecrawl em paralelo na edge function

No `ai-product-assistant`, as 4 queries de pesquisa (SKU) sao executadas sequencialmente num loop `for`. Alterar para executar todas em `Promise.all()` -- isto pode cortar o tempo de pesquisa para 1/4.

### 3. Pesquisa de logo de marca em paralelo com a extracao IA

Atualmente, a pesquisa de logo acontece **depois** da extracao IA. Mover para executar em paralelo com a chamada ao modelo de IA.

### 4. Enter para pesquisar + auto-focus

O campo SKU ja suporta Enter. Adicionar auto-focus no campo SKU quando o dialogo abre para que o utilizador possa colar o SKU e carregar Enter imediatamente.

## Seccao Tecnica

### Ficheiro: `supabase/functions/ai-product-assistant/index.ts`

**Paralelizar queries Firecrawl (modo sku-search):**
- Substituir o loop `for` sequencial das queries por `Promise.all()` para executar todas as 4 queries em simultaneo
- Mover a pesquisa de brand logo para correr em `Promise.all()` junto com a chamada ao modelo IA (em vez de depois)

Antes:
```text
for (const searchQuery of searchQueries) {
  // fetch one by one...
  if (allResults.length >= 8) break;
}
// ... AI extraction ...
// ... then brand logo search (sequential) ...
```

Depois:
```text
const searchPromises = searchQueries.map(q => fetchFirecrawl(q));
const searchResults = await Promise.all(searchPromises);
// merge all results...

// AI extraction + brand logo search in parallel
const [extractData, brandLogoUrl] = await Promise.all([
  fetch(AI_GATEWAY, ...),
  searchBrandLogo(brand, key)  // precisa de brand do texto raw
]);
```

Nota: como o brand so e extraido pela IA, a pesquisa de logo tera de usar um brand extraido do texto raw via regex simples (ex: procurar marcas conhecidas no conteudo) antes da chamada IA, ou manter sequencial apenas esta parte.

Abordagem final: paralelizar as queries Firecrawl entre si, e manter a pesquisa de logo apos a IA (pois depende do resultado). O ganho principal vem das queries paralelas.

### Ficheiro: `src/components/store/StoreQuickProductDialog.tsx`

**Auto-trigger pesquisa de precos:**
- Apos `setPreview(...)` no `handleSkuSearch` e `handleImageUpload`, chamar `handleSearchMarketPrices` automaticamente
- Usar `useEffect` que dispara quando `preview` muda (e preview.name existe)

**Auto-focus no campo SKU:**
- Adicionar ref ao input SKU e chamar `.focus()` quando o dialogo abre via `useEffect` no `open`

**Criar com Enter:**
- Adicionar handler de teclado global no dialogo: se preview existe e Ctrl+Enter e premido, dispara `handleCreate`

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ai-product-assistant/index.ts` | Paralelizar queries Firecrawl com `Promise.all()` em vez de loop sequencial |
| `src/components/store/StoreQuickProductDialog.tsx` | Auto-trigger pesquisa de precos apos preview, auto-focus no campo SKU, atalho Ctrl+Enter para criar |

