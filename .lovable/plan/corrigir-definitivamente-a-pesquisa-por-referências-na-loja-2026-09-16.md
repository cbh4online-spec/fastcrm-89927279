# Corrigir definitivamente a pesquisa por referências na loja

## Diagnóstico

A loja Ajax tem 46 artigos ativos e publicados com SKU preenchido, incluindo referências como `AJ-HOOD`, portanto existem referências válidas que a pesquisa deve encontrar.

A consulta atual pesquisa apenas no nome, descrição curta e `products.sku`. Não pesquisa:

- código de barras (`products.barcode`);
- código de artigo SAF-T (`products.saft_product_code`);
- SKU de variantes (`product_variants.sku`).

A correção anterior resolveu a passagem do identificador da loja e o parâmetro `?q=`, mas falta validar o pedido real no browser e disponibilizar a versão corrigida no endereço público.

## Decisões de produto/UX

- Uma única caixa deve encontrar artigos por nome, SKU principal, código de barras, código SAF-T e SKU de variante.
- A correspondência deve ser tolerante a espaços no início/fim e não distinguir maiúsculas de minúsculas.
- Apenas artigos ativos e publicados na loja atual podem aparecer; não haverá fuga de artigos entre espaços de trabalho.
- As sugestões devem mostrar a referência correspondente para o utilizador perceber por que razão o artigo foi encontrado.

## Estrutura técnica

1. Centralizar a normalização do termo de pesquisa e escapar caracteres que possam invalidar a consulta.
2. Alargar a pesquisa principal e o autocomplete aos identificadores existentes no produto.
3. Para referências de variantes, resolver primeiro os produtos correspondentes e manter os filtros de `workspace_id`, estado ativo e publicação na loja.
4. Evitar consultas desnecessárias quando o termo estiver vazio e manter paginação/ordenação atuais.
5. Adicionar testes para SKU completo/parcial, diferenças de capitalização, código de barras, código SAF-T, SKU de variante e isolamento entre lojas.

## Plano de implementação

1. Ajustar o hook partilhado da loja para pesquisar todos os identificadores suportados com normalização segura.
2. Atualizar sugestões e resultados para mostrarem a referência encontrada.
3. Validar no navegador com referências realmente publicadas na Ajax, incluindo `AJ-HOOD`, e confirmar os pedidos/respostas sem erros.
4. Validar também referência inexistente e referência existente noutro espaço de trabalho.
5. Executar typecheck, testes relevantes e verificação de consola em desktop e mobile.
6. Publicar a correção para que fique disponível em `fastcrm.metodopare.ai/store/ajax`.

## Critérios de aceitação

- `AJ-HOOD` encontra o artigo publicado correspondente na loja Ajax.
- Pesquisa parcial e em minúsculas encontra o mesmo artigo.
- Códigos de barras, códigos SAF-T e SKUs de variantes encontram o produto pai publicado.
- Um artigo não publicado ou pertencente a outra loja não aparece.
- Autocomplete e lista final devolvem resultados consistentes.
- Sem erros de consola, sem quebra da paginação e sem exposição entre espaços de trabalho.

## Riscos e pontos por validar

- Nem todos os artigos têm código de barras, código SAF-T ou variantes; estes campos serão usados apenas quando existirem.
- Se a referência indicada estiver num artigo não publicado na Ajax, continuará corretamente excluída; o estado de publicação terá de ser alterado separadamente se esse artigo deva estar à venda.
