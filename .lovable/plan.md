
## Problema Identificado

O edge function `productivity-coach` falha com:

```
ReferenceError: serve is not defined
    at file:///var/tmp/sb-compile-edge-runtime/functions/productivity-coach/index.ts:6:1
```

A função usa `serve(async (req) => { ... })` na linha 8, mas **nunca importa** `serve` do módulo Deno padrão. Isso impede a função de arrancar — qualquer chamada à IA (incluindo "Gerar com IA" no Coach de Produtividade) falha imediatamente.

## Causa

Ficheiro: `supabase/functions/productivity-coach/index.ts`

```ts
// Linha 1 — só importa supabase-js, falta o import de serve
import { createClient } from "@supabase/supabase-js";

// Linha 8 — usa serve sem o ter importado
serve(async (req) => { ... })
```

Falta a linha:
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
```

## Solução

### Alteração única — `supabase/functions/productivity-coach/index.ts`

Adicionar o import em falta na primeira linha do ficheiro:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
```

Depois de guardar, a função será reimplantada automaticamente e o botão "Gerar com IA" voltará a funcionar.

## Technical Details

- Nenhuma alteração de base de dados necessária.
- Nenhuma alteração de RLS necessária.
- Nenhuma variável secreta em falta — o `LOVABLE_API_KEY` já está configurado (a função chega ao ponto de verificar a API key antes de falhar com este erro).
- Todas as restantes edge functions que já funcionam (ex: `ai-employee-executor`) têm este import correto.
- Após o redeploy, as ações `generate-daily-priorities`, `prepare-meeting`, `suggest-free-slots`, e `analyze-goals-progress` devem funcionar sem mais alterações.
