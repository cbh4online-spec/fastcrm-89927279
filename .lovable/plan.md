# Produtos sem imagens na loja (ex.: FIBRA-HUBHYBRID-B)

## Diagnóstico (confirmado nos dados)

O produto **FIBRA-HUBHYBRID-B** tem **6 imagens guardadas** na galeria da ficha de produto, mas a lista de imagens usada pela loja está **vazia**.

Existem dois locais onde as imagens vivem:

- a **galeria da ficha de produto** (onde as 6 imagens foram adicionadas);
- a **lista de imagens do produto**, que é a única que a loja pública, os cartões, a pesquisa e os feeds leem.

Nada liga automaticamente a primeira à segunda. Por isso a página pública mostra o ícone de "sem imagem".

Não é caso isolado: outros produtos Ajax estão na mesma situação (`FIBRA-HUBHYBRID-W-NF` com 7, `FIBRA-HUBHYBRID-W-DUMMY` com 4).

Há ainda um segundo problema: a galeria só é legível por membros do workspace, ou seja, mesmo que a loja tentasse ler diretamente a galeria, um visitante público não veria nada.

## Correção proposta

Passar a manter a lista de imagens do produto **sempre sincronizada** com a galeria, automaticamente:

1. Sempre que uma imagem é adicionada, alterada, reordenada ou removida na galeria, a lista do produto é reescrita na mesma ordem (imagem de capa primeiro).
2. Correção retroativa: todos os produtos que hoje têm imagens na galeria e a lista vazia passam a ficar preenchidos — inclui o FIBRA-HUBHYBRID-B e os restantes casos.
3. A imagem principal passa a ser a de capa definida na galeria.

Vantagem: resolve de uma só vez a página pública, os cartões da loja, a pesquisa, as partilhas, os feeds e o AI Commerce, sem tornar a galeria pública nem duplicar dados de gestão.

## Notas técnicas

- Nova migração em `drizzle/migrations/`:
  - função `sync_product_images_array(p_product_id uuid)` (`SECURITY DEFINER`, `search_path = public`) que faz `UPDATE products SET images = <array de url ordenado por is_cover desc, position asc, created_at asc>, primary_image_index = 0` para o produto indicado, sempre dentro do mesmo `workspace_id`;
  - trigger `AFTER INSERT OR UPDATE OR DELETE` em `product_images` a invocar a função com `NEW`/`OLD.product_id`;
  - backfill único para os produtos com registos em `product_images` (idempotente, sem apagar arrays já preenchidos manualmente que contenham URLs não presentes na galeria — nesse caso a galeria manda, já que é a fonte usada na ficha).
- Sem alterações às políticas de acesso: a galeria continua restrita a membros do workspace; a loja continua a ler apenas `products.images`, que já é público para produtos publicados.
- Sem alterações de preços, stock, encomendas ou lógica de negócio.
- Verificação: consulta de controlo ao FIBRA-HUBHYBRID-B, abrir a página pública do produto no preview, adicionar/remover uma imagem na ficha e confirmar reflexo imediato na loja.

## Critérios de aceitação

- A página pública do FIBRA-HUBHYBRID-B mostra as 6 imagens, com a capa em primeiro lugar.
- Os restantes produtos com galeria preenchida deixam de aparecer sem imagem nas listagens e na pesquisa.
- Adicionar, reordenar, definir capa ou remover imagens na ficha reflete-se na loja sem passos extra.
- Produtos sem imagens continuam a mostrar o marcador de "sem imagem", sem erros.
