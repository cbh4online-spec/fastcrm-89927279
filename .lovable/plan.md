# Importar imagens de um link: acabar com o "não foram encontradas imagens"

## Diagnóstico (verificado)

Testei a página indicada (`aj-centerbutton-1g2w-gra-detail`). A página responde bem e **tem imagens do produto**, em dois formatos:

- imagem principal e detalhes em tamanho grande, disponíveis apenas em ligações da galeria (`AJ-CENTERBUTTON-1G2W-GRA.png`, `detalle1.png`, `detalle2.png`);
- miniaturas com sufixos `_thumb` e `_thumb2`.

No leitor de páginas actual há três fragilidades que explicam o erro intermitente:

1. As imagens grandes desta loja estão em ligações (`href`) da galeria. O extractor só lê `src`, `data-src`, `srcset` e `content` — nunca `href`. Fica dependente da lista de ligações que o serviço externo devolve, que às vezes vem vazia.
2. Só é pedido o HTML tratado. Quando esse HTML vem limpo/reduzido (acontece de forma intermitente), sobram apenas miniaturas.
3. As miniaturas com sufixo numerado (`_thumb2`) são descartadas sem tentar a versão original, porque a regra só reconhece `_thumb` colado à extensão.

Resultado: quando a lista de ligações não vem, ficam 0 candidatos e aparece "Não foram encontradas imagens nesta página".

## O que vai ser feito

Em `supabase/functions/product-image-search/index.ts`, no modo "Importar de link":

1. **Ler também as ligações do HTML** (`href`) e não só os atributos de imagem — é onde muitas lojas põem a versão grande.
2. **Pedir HTML tratado e HTML original** e usar ambos, para não depender de um só.
3. **Recuperar a versão original a partir da miniatura**: remover sufixos `_thumb`, `_thumb2`, `-thumb3`, `_small`, `_mini` antes da extensão e juntar essa versão aos candidatos (a miniatura fica como reserva se a original não existir).
4. **Leitura directa como plano B**: se o serviço externo devolver zero imagens, a função lê a página directamente (com identificação de navegador e tempo limite curto) e extrai as imagens do HTML. Confirmei que esta página responde a esse pedido.
5. **Mensagens úteis**: distinguir "página bloqueada", "página sem imagens de produto" e "só foram encontradas miniaturas", em vez da mensagem única actual.

Sem alterações ao ecrã de selecção, ao limite de 10 imagens por produto, ao armazenamento, a preços, stock ou permissões.

## Notas técnicas

- `extractImageUrlsFromHtml`: acrescentar `href` ao padrão de atributos.
- `scrape` com `formats: ['html','rawHtml','links']`, `onlyMainContent: false`, `waitFor: 2000`.
- Nova função `upgradeThumb(url)` com `/([._-])(thumb|thumbnail|small|mini)\d*(?=\.[a-z0-9]+(\?|$))/i`; candidatos passam a incluir original + miniatura (dedup por URL final).
- Plano B: `fetch(pageUrl)` com User-Agent de navegador, `AbortSignal.timeout(8000)`, limite de tamanho de resposta, e reutilização do mesmo extractor/filtros.
- Manter `looksLikeImage`, exclusão de `/templates/`, ordenação por SKU/slug e limite de 24 candidatos.
- Sem migrações nem alterações de RLS.

## Critérios de aceitação

- O link do `AJ-CENTERBUTTON-1G2W-GRA` devolve a imagem principal e as duas imagens de detalhe em tamanho grande.
- Repetir a mesma importação várias vezes devolve sempre imagens (sem falhas intermitentes).
- Uma página realmente bloqueada devolve mensagem explicativa, sem erro de consola.
- A pesquisa por nome continua igual.

## Riscos

- Lojas com anti-bot podem bloquear também a leitura directa; nesses casos a mensagem indica a pesquisa por nome.
- Alguns sites não têm versão original das miniaturas; nesse caso são oferecidas as miniaturas, com aviso.
