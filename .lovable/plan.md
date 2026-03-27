

## Corrigir erro na Edge Function `create-payment-link`

### Problema

A edge function `create-payment-link` tenta selecionar a coluna `stripe_price_id` da tabela `products`, mas essa coluna não existe nessa tabela. Isto causa um erro 500 do Postgres que resulta no "non-2xx status code" visível na UI.

### Solução

Remover `stripe_price_id` do SELECT na edge function e simplificar a lógica para usar sempre o caminho de checkout session com `price_data` inline (já que os produtos não têm `stripe_price_id` mapeado).

### Alteração

| Ficheiro | O que muda |
|---|---|
| `supabase/functions/create-payment-link/index.ts` | Remover `stripe_price_id` do `.select()`, remover o branch condicional `if (product.stripe_price_id)`, usar sempre checkout session com `price_data` inline |

Alteração mínima — apenas corrigir o bug para que a funcionalidade passe a funcionar.

