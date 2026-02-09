

# Melhorias da Loja Online - 4 Funcionalidades

Implementacao das 4 melhorias selecionadas: Pesquisa avancada com autocomplete, Quick View modal, Partilha social + SEO, e Paginacao / Infinite Scroll.

---

## 1. Pesquisa Avancada com Autocomplete

Substituir a pesquisa atual (submit manual) por um dropdown com resultados em tempo real enquanto o utilizador escreve.

**Comportamento:**
- Ao digitar (minimo 2 caracteres), apresentar dropdown com ate 6 produtos correspondentes (imagem, nome, preco)
- Debounce de 300ms para evitar excesso de queries
- Clicar num resultado navega para a pagina do produto
- Tecla Enter continua a funcionar como pesquisa completa no catalogo
- Historico de pesquisas recentes guardado em localStorage (ultimas 5)

**Ficheiros:**
- Criar `src/components/store/StoreSearchAutocomplete.tsx` - componente com Input + dropdown de resultados
- Modificar `src/components/store/StoreHeader.tsx` - substituir o Input atual pelo novo componente
- Utilizar o hook `useStoreProducts` existente com debounce via `useDebounce`

---

## 2. Quick View (Modal de Produto)

Permitir ver detalhes do produto sem sair do catalogo, atraves de um botao "Quick View" no hover do card.

**Comportamento:**
- Botao de "olho" aparece no hover do card (junto dos botoes de wishlist e carrinho)
- Abre um Dialog/modal com: imagem principal, nome, preco, descricao curta, badges, selector de quantidade, botao "Adicionar ao Carrinho"
- Botao "Ver Detalhes" navega para a pagina completa do produto

**Ficheiros:**
- Criar `src/components/store/StoreQuickViewModal.tsx` - modal com detalhes do produto
- Modificar `src/components/store/StoreProductCard.tsx` - adicionar botao Quick View no overlay e estado para abrir o modal

---

## 3. Partilha Social + SEO (Open Graph)

Adicionar botoes de partilha e melhorar as meta tags para previews ricos em redes sociais.

**Comportamento:**
- Na pagina do produto, adicionar botoes de partilha: WhatsApp, Facebook, Copiar Link
- Meta tags Open Graph completas: og:title, og:description, og:image, og:url, og:type
- Twitter Card meta tags

**Ficheiros:**
- Criar `src/components/store/StoreShareButtons.tsx` - botoes de partilha (WhatsApp, Facebook, Copiar)
- Modificar `src/pages/store/StoreProductPage.tsx` - adicionar meta tags OG no Helmet e inserir os botoes de partilha
- Modificar `src/pages/store/StorePage.tsx` - adicionar meta tags OG basicas para a homepage

---

## 4. Paginacao / Infinite Scroll

Carregar produtos de forma progressiva para melhorar performance em catalogos grandes.

**Comportamento:**
- Carregar 12 produtos inicialmente
- Ao fazer scroll ate ao final da grelha, carregar mais 12 automaticamente
- Indicador de "A carregar mais..." enquanto busca novos produtos
- Botao "Carregar Mais" como fallback caso o IntersectionObserver nao dispare

**Ficheiros:**
- Modificar `src/hooks/useStoreProducts.ts` - converter `useQuery` para `useInfiniteQuery` com paginacao via `.range()`
- Criar `src/hooks/useInfiniteScroll.ts` - hook com IntersectionObserver para detectar final da lista
- Modificar `src/pages/store/StorePage.tsx` - adaptar a grelha para usar dados paginados e inserir o trigger de scroll

---

## Detalhe Tecnico

### StoreSearchAutocomplete
- Usa `useStoreProducts` com `search` debounced (300ms) e limite de 6 resultados
- Dropdown posicionado com `absolute` abaixo do input
- Fecha ao clicar fora (onBlur com delay) ou ao pressionar Escape
- Historico em `localStorage` key `store-search-history`

### StoreQuickViewModal
- Utiliza `Dialog` do Radix UI (ja disponivel)
- Reutiliza logica de preco/badges do `StoreProductCard`
- Imagem principal com aspect-ratio fixo

### StoreShareButtons
- WhatsApp: `https://wa.me/?text=...`
- Facebook: `https://www.facebook.com/sharer/sharer.php?u=...`
- Copiar link: `navigator.clipboard.writeText()`
- Toast de confirmacao ao copiar

### useInfiniteQuery
- Usa `.range(from, to)` do Supabase para paginacao
- `getNextPageParam` calcula offset baseado no tamanho da pagina (12)
- `hasNextPage` retorna false quando pagina retorna menos de 12 itens
- Flatten de `data.pages` para array unico na StorePage

### Ordem de implementacao
1. Pesquisa Autocomplete (independente)
2. Quick View Modal (independente)
3. Partilha Social + SEO (independente)
4. Infinite Scroll (requer refactor do hook de produtos)

