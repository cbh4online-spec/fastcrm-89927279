

# Corrigir Edge Function `hr-job-ai-assist`

## Diagnóstico

A edge function falha com `TypeError: supabase.auth.getClaims is not a function`. A versão `@supabase/supabase-js@2.49.1` importada via esm.sh não suporta `getClaims()`. Todas as outras edge functions do projecto usam `getUser()`.

## Alteração

| Ficheiro | Acção |
|---|---|
| `supabase/functions/hr-job-ai-assist/index.ts` | Substituir `getClaims()` por `getUser()` — padrão do projecto |

### Detalhe

Linhas 31-34: substituir:
```typescript
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
const userId = claimsData.claims.sub;
```

Por:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);
const userId = user.id;
```

Sem mais alterações necessárias — o resto da função está correcto.

