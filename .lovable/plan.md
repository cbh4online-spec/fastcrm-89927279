

# Atualizar APP_URL para o domínio correto

## Problema
As edge functions `meta-oauth-callback` e `instagram-oauth-callback` usam `APP_URL` com fallback para `https://fastcrm.lovable.app`. Após o OAuth, os redirects vão para o domínio errado. O domínio correto é `https://fastcrm.metodopare.ai`.

## Solução
Configurar o secret `APP_URL` com o valor `https://fastcrm.metodopare.ai` para que ambas as edge functions redirecionem para o domínio correto após o OAuth.

Alternativamente, atualizar o fallback hardcoded em ambas as funções:
- `supabase/functions/meta-oauth-callback/index.ts` linha 12
- `supabase/functions/instagram-oauth-callback/index.ts` linha 12

De: `const APP_URL = Deno.env.get("APP_URL") || "https://fastcrm.lovable.app";`
Para: `const APP_URL = Deno.env.get("APP_URL") || "https://fastcrm.metodopare.ai";`

## Abordagem recomendada
Fazer ambas as coisas:
1. Atualizar o fallback hardcoded nas 2 edge functions
2. Adicionar o secret `APP_URL` = `https://fastcrm.metodopare.ai` para flexibilidade futura

