# Categorias não aparecem na loja pública

## Diagnóstico (confirmado nos dados)

As 9 categorias existem, estão activas e visíveis na loja. O que falha é a **ligação entre produtos e categorias**:

- Nenhum dos 630 produtos publicados tem categoria atribuída no campo de ligação (`store_category_id` = 0 em todos).
- Os produtos guardam a categoria apenas como **texto** (`category`): "Conforto e Automação" (179), "CCTV Ajax" (118), "Ajax Fibra" (110), "Instalação e Manutenção" (105), "Incêndio Residencial" (36), "Incêndio EN54" (33), "Intrusão" (32), "Acessórios de Segurança" (6), "Armazenamento de Dados" (5), "Energia e Baterias" (2), "Domótica" (2), "Ferramentas Manuais" (1), "intrusão" (1, minúsculas).
- A loja só mostra categorias com produtos contados pela ligação, por isso a lista fica vazia e só sobra "Todas as categorias".
- Três nomes usados nos produtos não existem na lista de categorias: **Ajax Fibra**, **Incêndio Residencial** e o duplicado **"intrusão"** em minúsculas.

## O que vai ser feito

1. **Ligar cada produto à sua categoria** a partir do nome que já tem, sem alterar textos, preços, stock ou publicação.
2. **Criar as categorias em falta** (Ajax Fibra, Incêndio Residencial), activas e visíveis na loja.
3. **Unificar o duplicado** "intrusão" com "Intrusão" (o produto passa a ficar em Intrusão; o texto do produto é normalizado).
4. **Tornar a lista de categorias tolerante**: se um produto ainda não tiver ligação, a contagem passa a considerar também a correspondência pelo nome (sem distinguir maiúsculas/acentos), para não voltar a ficar vazia.
5. **Manter automático para o futuro**: produtos novos ou editados ficam ligados à categoria correspondente ao nome escolhido.

Resultado esperado: a barra lateral da loja passa a mostrar as categorias com o número de produtos (ex.: Conforto e Automação 179, CCTV Ajax 118, Ajax Fibra 110, …) e a filtragem por categoria funciona.

## Notas técnicas

- Migração: função `sync_product_store_category(p_product_id uuid)` que resolve `store_category_id` a partir de `products.category` (comparação por `lower(unaccent(trim(...)))`), criando a categoria se não existir (activa, `store_visible = true`, mesmo `workspace_id`); trigger `BEFORE INSERT OR UPDATE OF category, store_category_id` em `products`; backfill idempotente para os produtos com `store_category_id IS NULL` e `category` preenchida. Normaliza "intrusão" → "Intrusão" no texto do produto. Sem `DROP`, sem alterações de RLS/preços/stock.
- `src/hooks/useStoreCategories` (em `src/hooks/useStoreProducts.ts`): contagem passa a somar `store_category_id` **ou** correspondência normalizada de `products.category` ao nome/slug da categoria; mantém o filtro "só categorias com pelo menos 1 produto publicado".
- Filtro na loja continua a usar `categoryId` (`store_category_id`), agora preenchido; nada muda na navegação.

## Critérios de aceitação

- Loja pública de Ajax Systems mostra as categorias com contagens correctas na barra lateral.
- Clicar numa categoria mostra apenas os produtos dessa categoria.
- Nenhuma categoria duplicada por diferença de maiúsculas/acentos.
- Um produto novo com categoria escrita fica automaticamente ligado e visível no filtro.
