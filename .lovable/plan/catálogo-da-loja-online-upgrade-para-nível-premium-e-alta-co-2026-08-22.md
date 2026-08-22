# Catálogo da loja online — upgrade para nível premium e alta conversão

## Diagnóstico

O catálogo atual (`/store/:slug`) tem a base certa mas está subaproveitado:

- A grelha é fixa (2/3 colunas), sem modo lista, sem densidade, sem vista rápida. O cartão não expõe ações premium (favoritos, comparar, adicionar rápido) de forma consistente.
- A barra de filtros só tem categoria, preço, stock, condição e uma ordenação. Não há marcas, atributos, variantes, promoções, faixas de preço rápidas nem chips de filtros ativos removíveis.
- A ordenação não inclui critérios de conversão (mais vendidos, melhor avaliados, maior desconto).
- Não há breadcrumbs, contagem/paginação visível no topo, nem estados de resultado por filtro; o estado vazio não sugere recuperação (limpar filtros, sugestões).
- Existem componentes fortes já construídos e não ligados à listagem: `StoreQuickViewModal`, `StoreQuickBuyButton`, `StoreTrustStrip`, `StoreVolumeDiscountTable`, `StoreFreeShippingBar`, `StorePromoBadge`, `StoreCompareBar`.
- SEO da listagem limitado: sem `ItemList` JSON-LD por página, sem canonical por categoria, sem título dinâmico por filtro.

## Decisões de produto/UX

1. Catálogo como página de decisão, não montra: filtros ricos à esquerda, chips de filtros ativos no topo, toolbar única com contagem, ordenação e alternância grelha/lista.
2. Reduzir cliques até ao carrinho: vista rápida em modal e adicionar ao carrinho a partir do cartão, com feedback imediato e barra de envio grátis.
3. Confiança visível: faixa de garantias por cima da grelha, badges consistentes (novo, promoção, stock baixo, mais vendido), prova social com avaliações e vendas.
4. Sem perder nada do que existe: hero, C2C, comparador, IA, exit intent, recentemente vistos e FAQ mantêm-se e passam a conviver com a nova toolbar.
5. Layout limpo estilo premium: muito espaço branco, hierarquia tipográfica, tokens semânticos, zero cores hardcoded.

## Estrutura técnica

Novos componentes em `src/components/store/storefront/`:

- `StoreCatalogToolbar.tsx` — contagem, ordenação alargada, alternância grelha/lista, densidade, botão de filtros mobile.
- `StoreActiveFilterChips.tsx` — chips removíveis + "limpar tudo".
- `StoreCatalogBreadcrumbs.tsx` — Início › Categoria (com JSON-LD `BreadcrumbList`).
- `StoreCatalogEmptyState.tsx` — estado vazio com ações de recuperação e sugestões.
- `StoreProductListRow.tsx` — variante lista do cartão (imagem, resumo, preço, CTA).

Alterações:

- `StoreFilterSidebar.tsx`: acrescentar marcas, atributos/variantes, promoções, avaliação mínima e faixas rápidas de preço; manter API `StoreFilters` retrocompatível (campos novos opcionais).
- `StoreCatalogSection.tsx`: integrar toolbar, chips, breadcrumbs, faixa de confiança, vista lista/grelha e novo estado vazio; manter infinite scroll e sentinel.
- `StoreProductCard.tsx`: overlay de ações (vista rápida, favoritos, comparar), adicionar ao carrinho sem sair da listagem, badges normalizados, aspect ratio consistente e `loading="lazy"`.
- `StorePage.tsx`: passar os filtros novos aos hooks; filtros não suportados no servidor aplicados em memória sobre `allProducts`.
- `useStoreProducts.ts`: aceitar os novos parâmetros de ordenação/filtro sem quebrar chamadas existentes.
- `StoreSeoHead.tsx`: `ItemList` JSON-LD da página atual, canonical por categoria e título/descrição dinâmicos por filtro.

Sem alterações de esquema de base de dados nem de RLS. Marcas e atributos são derivados dos produtos já devolvidos.

## Plano de implementação

1. Toolbar, chips de filtros ativos, breadcrumbs e novo estado vazio.
2. Filtros avançados na sidebar (marca, atributos, promoção, avaliação, faixas rápidas) com aplicação servidor/cliente.
3. Cartão premium + vista rápida + adicionar ao carrinho na listagem + vista lista.
4. Faixa de confiança, barra de envio grátis e prova social integradas na listagem.
5. SEO da listagem (ItemList, canonical, títulos dinâmicos) e acessibilidade (foco visível, labels, navegação por teclado no modal).
6. Validação no preview: desktop 1280px e mobile 390px, consola limpa, estados loading/vazio/erro.

## Critérios de aceitação

- Filtrar, ordenar, limpar filtros e alternar grelha/lista funcionam sem recarregar a página e sem perder o scroll infinito.
- É possível ver detalhes e adicionar ao carrinho sem sair do catálogo.
- Chips refletem sempre os filtros ativos e removem individualmente.
- Estado vazio oferece caminho de recuperação; estados de loading em esqueleto.
- Nenhuma funcionalidade existente desaparece (hero, C2C, comparador, IA, FAQ, recentemente vistos, exit intent).
- Sem cores hardcoded; apenas tokens semânticos. Sem erros de consola.
- Legível e utilizável a 390px e 1280px.

## Riscos e pontos por validar

- Filtros aplicados em memória interagem com scroll infinito: em catálogos grandes, filtros só de cliente podem parecer incompletos — mitigado enviando ao servidor tudo o que a consulta suportar.
- Marcas/atributos dependem da qualidade dos dados do produto; se estiverem vazios, esses filtros não são apresentados.
- Adicionar ao carrinho a partir da listagem exige tratamento de produtos com variantes: nesses casos abre a vista rápida em vez de adicionar diretamente.
