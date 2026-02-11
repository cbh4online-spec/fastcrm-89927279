
# Corrigir IA nao disponivel na loja

## Problema
Os pedidos de IA funcionam quando chamados diretamente, mas falham no browser porque os headers CORS da edge function estao incompletos. O browser do Supabase JS SDK envia headers adicionais (`x-supabase-client-platform`, etc.) que nao estao na lista de headers permitidos, fazendo o preflight CORS falhar.

## Solucao
Atualizar os headers CORS na edge function `ai-product-assistant` para incluir todos os headers enviados pelo SDK do Supabase.

## Seccao Tecnica

### Ficheiro a alterar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ai-product-assistant/index.ts` | Atualizar `corsHeaders` (linha 3-6) |

### Alteracao especifica

Substituir:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
```

Por:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
```

Alem disso, o modelo usado para gerar banners (`google/gemini-2.5-flash-image`) nao existe na lista de modelos suportados. Sera corrigido para `google/gemini-3-pro-image-preview`.

### Resumo das correcoes

1. **CORS headers incompletos** -- Adicionar headers do SDK Supabase para permitir chamadas do browser
2. **Modelo de imagem invalido** -- Corrigir `google/gemini-2.5-flash-image` para `google/gemini-3-pro-image-preview` (linha 1347)
