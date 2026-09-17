# Catálogo Pharliss — endereço protegido em JSON

## Diagnóstico

O workspace PHARLISS tem 752 produtos (741 activos, apenas 211 publicados na loja).
Não existe hoje nenhum endereço que devolva o catálogo em JSON sem passar pela loja
pública, e a loja pública mostra só produtos publicados.

## O que vai ser criado

Uma função de servidor `pharliss-catalogo` que devolve, em JSON, **apenas**:

- `sku`
- `name`
- `images` (lista de endereços das fotografias)

Fica de fora tudo o resto: custos, margens, fornecedores, stock, preços,
notas internas. Inclui produtos não publicados na loja.

Acesso só com um segredo enviado no cabeçalho `Authorization: Bearer <token>`.
Sem token, ou com token errado, devolve erro 401 e nada mais.

Resposta:

```json
{
  "workspace": "PHARLISS",
  "count": 752,
  "products": [
    { "sku": "EXEMPLO-1", "name": "Nome do produto", "images": ["https://..."] }
  ]
}
```

## Detalhes técnicos

- Nova edge function `supabase/functions/pharliss-catalogo/index.ts`, com
  `verify_jwt = false` em `supabase/config.toml` e validação do token feita
  em código (comparação em tempo constante).
- Workspace fixo por ID (`0662fc16-6286-4156-a908-08c7dfec0fb7`), nunca aceite
  por parâmetro, para impedir leitura de outros workspaces.
- Leitura via `service_role` com `select("sku, name, images")` e filtro
  `deleted_at is null`; paginação interna em páginas de 1000 para cobrir todo
  o catálogo. Ordenação por `name`.
- Parâmetros opcionais de leitura: `?status=active` (por omissão devolve todos
  os não eliminados) e `?limit`/`?offset` validados com zod.
- Imagens: usa `products.images`; se estiver vazio, recorre a `product_images`
  ordenado por capa/posição — o mesmo comportamento já usado na loja.
- CORS: `corsHeaders` de `npm:@supabase/supabase-js@2/cors` em todas as
  respostas, incluindo erros, e resposta a `OPTIONS`.
- Só aceita `GET` (e `OPTIONS`); qualquer outro método devolve 405.
- Rate limiting simples em memória por IP para evitar abuso.
- Registo em log de tentativas falhadas de autenticação, sem escrever o token.

## Segredo e valor do token

O token é gerado por mim como um valor aleatório forte (32 bytes em hexadecimal)
e guardado no segredo `PHARLISS_CATALOGO_TOKEN`. Faço-o desta forma, e não com
geração automática fechada, precisamente porque pediu para lhe indicar o valor —
a geração automática nunca revela o valor. Assim que estiver aplicado, envio-lhe
no chat o endereço final e o token.

Se preferir usar um token da sua escolha, diga o valor e eu guardo esse.

## Critérios de aceitação

- Pedido sem cabeçalho `Authorization` → 401.
- Pedido com token errado → 401.
- Pedido com o token correcto → 200 com os 752 produtos.
- A resposta não contém qualquer campo de custo, margem, fornecedor ou stock.
- Produtos não publicados na loja aparecem na lista.

## Riscos

- Quem tiver o token vê nomes, referências e fotografias de todo o catálogo.
  O token é revogável: basta pedir-me para o substituir.
