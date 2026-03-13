

# Fix: Publicação Bloqueada há 24h

## Diagnóstico

O deploy das Edge Functions está provavelmente a falhar silenciosamente, o que bloqueia o processo de publicação. Encontrei os seguintes problemas:

### 1. Import duplicado no `chat-widget/index.ts` (erro de compilação)
```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // DUPLICADO
```
Isto causa um erro de compilação Deno que pode bloquear o deploy.

### 2. Imports `esm.sh` inconsistentes (~130 ficheiros)
Muitas Edge Functions usam `https://esm.sh/@supabase/supabase-js@2` em vez do alias `@supabase/supabase-js` definido no `deno.json`. Embora não sejam erros de compilação, podem causar incompatibilidades de lockfile e lentidão no deploy.

### 3. Imports `deno.land/x/xhr` obsoletos (6 ficheiros)
O polyfill XHR (`https://deno.land/x/xhr@0.1.0/mod.ts`) já não é necessário no Deno moderno e pode causar falhas de resolução.

## Plano de Correção

### Fase 1 — Correção crítica (desbloquear deploy)
| Ficheiro | Correção |
|----------|----------|
| `chat-widget/index.ts` | Remover a linha 2 (import duplicado) |

### Fase 2 — Estabilizar imports (prevenir bloqueios futuros)
Nos ~130 ficheiros que usam `esm.sh` para supabase-js, substituir por o alias do import map:
- `from "https://esm.sh/@supabase/supabase-js@2"` → `from "@supabase/supabase-js"`
- Remover `import "https://deno.land/x/xhr@0.1.0/mod.ts"` dos 6 ficheiros

Isto é um volume grande de alterações (~130 ficheiros). Posso fazê-lo em lotes.

### Fase 3 — Forçar re-deploy
Após as correções, forçar o deploy de todas as funções afetadas.

## Nota Importante
Com ~250+ Edge Functions no projeto, o processo de publicação pode demorar significativamente. A correção do import duplicado é a mais provável causa do bloqueio atual.

