

## Diagnóstico: Erro ao Scan Duplicados

### Problemas Identificados

1. **CORS Headers Incompletos** — As edge functions `detect-lead-duplicates` e `merge-leads` têm headers CORS que não incluem todos os headers necessários enviados pelo cliente Supabase (`x-supabase-client-platform`, etc.). Isto causa falha na preflight request do browser.

2. **Função não registada em config.toml** — Embora não seja obrigatório para `verify_jwt = true` (o default), adicionar as funções garante que são reconhecidas e deployadas corretamente.

### Plano de Correção

**1. Corrigir CORS em ambas as edge functions**

Atualizar os `corsHeaders` em `detect-lead-duplicates/index.ts` e `merge-leads/index.ts` para incluir todos os headers:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

**2. Adicionar funções ao config.toml**

Registar `detect-lead-duplicates` e `merge-leads` com `verify_jwt = false` (as funções já validam auth manualmente no código):
```toml
[functions.detect-lead-duplicates]
  verify_jwt = false
[functions.merge-leads]
  verify_jwt = false
```

**3. Melhorar error handling no frontend**

Atualizar `useDetectLeadDuplicates` para mostrar a mensagem de erro real ao utilizador em vez de uma genérica.

### Ficheiros a alterar
- `supabase/functions/detect-lead-duplicates/index.ts` — CORS fix
- `supabase/functions/merge-leads/index.ts` — CORS fix  
- `supabase/config.toml` — registar funções
- `src/hooks/useLeadDuplicateEngine.ts` — melhorar toast de erro

