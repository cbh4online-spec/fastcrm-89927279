# Importar imagens a partir do link de uma página de produto

## Resposta curta

Sim, é possível. Já existe a pesquisa de imagens online e o download feito no servidor (que evita bloqueios). Falta apenas poder **colar o endereço da página do produto** (ex.: a página da Visiotech do `AJ-EN54-INTERNALBATTERY-24H-W`) e o sistema mostrar as imagens dessa página para escolher e adicionar.

## O que vai passar a existir

No separador Conteúdo → Imagens da ficha de produto, o botão "Pesquisar Web" passa a ter dois modos:

1. **Pesquisar por nome/referência** (comportamento atual).
2. **Importar de um link** (novo): cola-se o endereço da página do produto, o sistema lê essa página e mostra as imagens encontradas em grelha.

Depois é igual ao que já existe: escolhem-se as imagens (até ao limite de 10 por produto), pré-visualização, e "Adicionar ao produto" — o download é feito no servidor e as imagens ficam guardadas no armazenamento do próprio workspace.

Se a página incluir a referência do produto, o sistema dá prioridade às imagens cujo endereço contém essa referência (ex.: `aj-en54-internalbattery-24h-w`), para não trazer imagens de produtos relacionados.

## Comportamento e limites

- Só endereços `http`/`https`; imagens de qualquer origem são descarregadas no servidor com a página de origem como referência.
- São ignoradas imagens que sejam claramente logótipos, ícones, banners, bandeiras ou miniaturas muito pequenas.
- Se a página bloquear a leitura (proteção anti-bot) ou não tiver imagens, é mostrada mensagem clara com sugestão de usar a pesquisa por nome.
- Falhas individuais não impedem as restantes; ao fim é indicado quantas entraram e o motivo das que falharam.
- Nada é inventado nem gerado por IA: só imagens efectivamente presentes na página indicada.
- Aviso visível de que as imagens são de terceiros e o utilizador é responsável pelos direitos de uso.

## Notas técnicas

- `supabase/functions/product-image-search/index.ts`: aceitar `pageUrl` no corpo do pedido. Quando presente, salta o `search` do Firecrawl e faz apenas `scrape` desse URL com `formats: ['html','links','rawHtml']`, extraindo:
  - `metadata.ogImage`;
  - `src`/`data-src`/`srcset` do HTML e URLs de imagem em `links`;
  - resolução de endereços relativos contra o `pageUrl`.
  Reutiliza o filtro `looksLikeImage` existente, junta exclusão de dimensões-miniatura (`_50x50`, `thumb`) e ordena colocando primeiro as que contêm o SKU/slug do produto. Validação do `pageUrl` com zod (protocolo, comprimento) e limite de resultados.
- `src/components/products/ProductImageWebSearchDialog.tsx`: `Tabs` com "Pesquisar" e "Importar de link"; campo de URL com validação; reutiliza integralmente a grelha, selecção, pré-visualização e o fluxo `product-images-import-url` já existentes.
- `product-images-import-url` fica inalterado (já envia `Referer` da origem e limita a 6 ficheiros / 8 MB por imagem).
- Sem alterações de base de dados, RLS ou lógica de preços.

## Critérios de aceitação

- Colar o link da página Visiotech do `AJ-EN54-INTERNALBATTERY-24H-W` mostra as imagens desse produto.
- Selecionar 2–4 imagens e "Adicionar ao produto" grava-as na galeria, na ordem escolhida.
- Página sem imagens ou bloqueada devolve mensagem explicativa, sem erro de consola.
- Modo de pesquisa por nome continua a funcionar como antes.
