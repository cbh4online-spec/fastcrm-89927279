# Ficha de produto pública — correção de layout

## Diagnóstico

Na captura, a coluna de compra fica espremida: os cartões "Comprar agora" e "Fazer uma oferta" ficam lado a lado num espaço demasiado estreito, o preço quebra em duas linhas e o botão "Adicionar ao carrinho" aparece cortado.

Causas confirmadas no código:

- A grelha principal usa `lg:grid-cols-[1fr_1fr_320px]` — a coluna de compra fica fixa em 320px (≈280px úteis depois do padding), insuficiente para dois cartões com preço a 24px e botão com ícone.
- Entre 1024px e ~1280px, as três colunas competem pelo mesmo espaço: galeria e informação ficam largas e a caixa de compra fica com a largura mínima.
- O seletor de modo de compra decide o número de colunas por container query, mas o limiar atual (`@md`, 448px) é atingido em situações em que os cartões ainda não têm largura confortável.

## O que vai mudar (apresentação apenas)

Nenhuma funcionalidade é removida: todos os passos, botões, diálogos, bundles, alternativas e sinais de confiança continuam iguais. Só muda a forma como o espaço é distribuído.

### 1. Coluna de compra mais larga e elástica
- Passar a coluna de `320px` fixos para um intervalo flexível (≈360–400px), reduzindo a largura das colunas de galeria/informação quando necessário.
- Introduzir um degrau intermédio: em ecrãs entre ~1024px e ~1280px, a caixa de compra passa a ocupar a largura total por baixo de galeria+informação, em vez de espremer três colunas.

### 2. Cartões empilham sempre que não couberem
- Elevar o limiar da container query do seletor de modo: os cartões "Comprar agora" e "Fazer uma oferta" só ficam lado a lado acima de ~420px reais de painel; abaixo disso empilham, com botões a largura total.
- O mesmo critério aplica-se ao seletor de bundles e às alternativas, para manter coerência entre os passos.

### 3. Botões e preços nunca cortados
- Garantir que os botões dos quatro passos usam altura automática, texto que quebra e largura total dentro do cartão.
- Preço e etiqueta de IVA numa linha alinhada pela base, com quebra controlada em vez de transbordo.

### 4. Restante ficha de produto
- Barra fixa superior ("Adicionar"): limitar a largura do nome/SKU e garantir que o botão nunca é comprimido nem se sobrepõe ao conteúdo abaixo.
- Galeria: manter miniaturas verticais em desktop, mas evitar que a imagem principal encolha em ecrãs médios quando a coluna de compra aumenta.
- Coluna de informação: largura de leitura limitada, espaçamento uniforme entre descrição, destaques e partilha.
- Secções abaixo (descrição, Q&A, avaliações, relacionados): alinhar à mesma largura máxima e usar o mesmo espaçamento vertical.
- Mobile: confirmar que a barra de conversão fixa não tapa o último bloco (padding inferior no conteúdo).

## Detalhes técnicos

- `src/pages/store/StoreProductPage.tsx`: grelha principal passa a `lg:grid-cols-[1fr_minmax(0,1fr)] xl:grid-cols-[1fr_1fr_minmax(360px,400px)]`, com a caixa de compra em `lg:col-span-2 xl:col-span-1`; `items-start` mantém-se.
- `src/components/store/purchase/PurchaseModeChooser.tsx`: `@md:grid-cols-2` → limiar arbitrário `@[420px]:grid-cols-2`.
- `src/components/store/purchase/BundleTierSelector.tsx` e `StoreCheaperAlternatives.tsx`: mesmo limiar de container query.
- `src/components/store/StoreStickyAddToCart.tsx`: `min-w-0` + `truncate` no bloco de texto, `flex-shrink-0` no botão.
- Sem alterações a hooks, queries, RLS, preços ou lógica de carrinho.

## Critérios de aceitação

- Em 1180×742 (viewport atual) o botão "Adicionar ao carrinho" aparece inteiro e o preço numa só linha.
- Entre 768px e 1440px não há texto cortado nem sobreposição na caixa de compra.
- Passos vazios continuam ocultos e a numeração recalcula-se.
- Todas as ações existentes continuam acessíveis (comprar, fazer oferta, bundles, alternativas, wishlist, partilha, Q&A).
- Consola sem novos erros.

## Validação

Playwright na rota `/store/<slug>/product/<id>` em 768, 1024, 1180, 1440 e 390px, com captura de ecrã em cada largura.
