

# Corrigir Edge Function `ebook-ai-assist` — Falha no Deploy

## Problema

O erro **"Failed to send a request to the Edge Function"** indica que a edge function `ebook-ai-assist` não está deployada. O ficheiro existe em `supabase/functions/ebook-ai-assist/index.ts` mas nunca foi deployado com sucesso (sem logs no servidor).

## Solução

Forçar o re-deploy da edge function. O código da função está correcto — usa CORS headers, LOVABLE_API_KEY, e o gateway `ai.gateway.lovable.dev`. Apenas precisa de ser deployado.

### Passo único

Fazer deploy da função `ebook-ai-assist` usando a ferramenta de deploy de edge functions.

Caso o deploy falhe, verificar:
1. Se o `LOVABLE_API_KEY` está configurado como secret
2. Se há erros de sintaxe no `index.ts` (improvável — o código está limpo)

Nenhuma alteração de código é necessária.

