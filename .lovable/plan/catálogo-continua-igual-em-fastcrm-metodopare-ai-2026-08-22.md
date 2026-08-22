# Catálogo continua igual em fastcrm.metodopare.ai

## Diagnóstico

O código novo do catálogo está de facto no projeto: `StoreCatalogSection.tsx` já importa e usa `StoreCatalogToolbar`, `StoreActiveFilterChips` e o modo grelha/lista, e `StorePage.tsx` já passa `brandFacets`.

O domínio `fastcrm.metodopare.ai` serve o último build publicado (bundle `assets/index-BoLZkob9.js`), que é anterior a estas alterações. Por isso a página pública continua com o catálogo antigo — não é um bug de código, é falta de publicação.

## O que fazer

1. Publicar o projeto para o domínio personalizado atualizar o build.
2. Após publicar, abrir `https://fastcrm.metodopare.ai/store/ajax` com refresh forçado (cache do browser/CDN) e confirmar:
   - barra de ferramentas com contagem, 7 ordenações, grelha/lista e densidade;
   - chips de filtros ativos removíveis;
   - filtros novos na sidebar (marcas, promoções, avaliação, faixas rápidas de preço);
   - breadcrumbs e estado vazio com sugestões.
3. Se, já depois de publicar e limpar cache, o catálogo continuar igual, investigo em detalhe (rota do storefront no domínio, service worker, cache de CDN).

## Notas técnicas

- Nenhuma alteração de base de dados ou RLS envolvida.
- Se preferires validar antes de publicar, posso verificar primeiro no URL de pré-visualização, que já corre o código novo.
