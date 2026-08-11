# Ficha de produto: fechar o espaço em branco e URLs amigáveis para SEO

## Diagnóstico

Verificado no código (`src/pages/store/StoreProductPage.tsx`, `ProductSeoHead.tsx`) e no esquema da tabela `products`:

1. **Espaço em branco** — a grelha é de 3 zonas (galeria | informação | caixa de compra) com `items-start`. A caixa de compra é muito mais alta (~1000px) do que a galeria e a coluna de informação, que terminam cedo. Como as secções seguintes ("Sobre este produto", Q&A, avaliações) só começam depois da linha inteira da grelha, fica uma área vazia grande entre as duas colunas da esquerda e a secção seguinte.
2. **URL** — a rota é `/:workspaceSlug/product/:productId` (`src/routes/StoreRoutes.tsx`) e o canonical em `ProductSeoHead` usa o UUID. Um UUID não transmite qualquer sinal semântico aos motores de busca e não é partilhável/legível. A tabela `products` já tem uma coluna `sheet_slug` (hoje usada noutro contexto), mas não existe slug público de loja.

## O que vai mudar

### 1. Fechar o espaço em branco (apresentação)

- As secções longas de conteúdo (descrição "Sobre este produto", especificações, Q&A, avaliações, relacionados) passam a fluir **por baixo das colunas galeria+informação**, dentro da mesma linha da grelha, enquanto a caixa de compra continua sticky à direita em ecrãs XL. Deixa de existir a faixa branca.
- Em ecrãs abaixo de XL o comportamento atual mantém-se (empilhado), sem regressões.
- Ajustes menores: limitar a altura da galeria em ecrãs médios e uniformizar o espaçamento vertical entre blocos.

### 2. URLs amigáveis para SEO

- Novo campo público `store_slug` em `products` (único por workspace), gerado automaticamente a partir do nome (ex.: `ajax-hub-2-plus-kit-alarme`), com preenchimento retroativo para os produtos existentes e geração automática em novos produtos.
- Nova rota: `/store/:workspaceSlug/product/:slug` — o URL passa a ser
  `fastcrm.metodopare.ai/store/ajax/product/ajax-hub-2-plus-kit-alarme`.
- Compatibilidade: os URLs antigos com UUID continuam a funcionar e redirecionam (301 no lado do cliente, `replace`) para o URL com slug — nada partilhado anteriormente fica quebrado.
- Todos os pontos que geram links de produto (pesquisa, relacionados, wishlist, best sellers, recomendações da IA, alternativas) passam a usar o helper único `getStorefrontItemPath`, já existente, agora com slug.
- SEO: canonical, `og:url` e o JSON-LD do produto passam a apontar para o URL com slug; o sitemap dinâmico da loja passa a listar os slugs.
- Edição do slug no backoffice (separador SEO do produto), com validação de unicidade e aviso de que alterar o slug muda o URL público.

## Detalhes técnicos

- Migração: `ALTER TABLE products ADD COLUMN store_slug text`, índice único `(workspace_id, store_slug)`, backfill via `slugify(name)` com sufixo numérico em colisões, trigger `BEFORE INSERT` para preencher quando vazio. Grants/RLS existentes mantêm-se (coluna não sensível).
- Resolução na página: procurar por `store_slug` primeiro; se o parâmetro for um UUID válido, procurar por `id` e fazer `navigate(..., { replace: true })` para o slug.
- Ficheiros previstos: `src/routes/StoreRoutes.tsx`, `src/pages/store/StoreProductPage.tsx`, `src/hooks/store/*` (query do produto), `src/utils/getStorefrontItemPath.ts`, `src/components/store/storefront/ProductSeoHead.tsx`, componentes de listagem que geram links, e o gerador de sitemap dinâmico.

## Critérios de aceitação

- Sem faixa branca entre a coluna de informação e a secção "Sobre este produto" em 1180px, 1440px e 1920px.
- `/store/ajax/product/<slug>` abre a ficha; o URL antigo com UUID redireciona para o slug.
- Canonical, og:url e JSON-LD com o URL de slug; sitemap atualizado.
- Todos os links internos de produto usam slug; sem erros de consola.

## Riscos e pontos por validar

- Colisão de nomes iguais no mesmo workspace: resolvida com sufixo `-2`, `-3`.
- Alterar o slug depois de indexado perde histórico SEO — por isso o aviso no backoffice e o redirect a partir do UUID.
