

## Plano: Corrigir crash na Edge Function `ghl-list-social-channels`

### Diagnóstico
A função arranca (boot ~24ms) mas encerra imediatamente sem processar pedidos. A causa é o uso de `userClient.auth.getClaims(token)` (linha 36) — este método **não existe** no SDK `@supabase/supabase-js@2`. A chamada lança uma excepção não tratada que mata o runtime antes de devolver resposta, provocando blank screen no frontend.

### Alteração

**Ficheiro:** `supabase/functions/ghl-list-social-channels/index.ts`

1. **Substituir `getClaims()` por `getUser()`** — método padrão do SDK v2 para validar o token e obter o `user_id`.

2. **Aplicar padrão de erro resiliente** — o `catch` global deve devolver HTTP 200 com payload estruturado (`ok: false, error, fallback: true`) para evitar blank screens no frontend, seguindo o padrão da plataforma.

### Código relevante (antes → depois)

```typescript
// ANTES (linha 35-43) — CRASH
const { data: claimsData, error: claimsError } =
  await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub as string;

// DEPOIS — funcional
const { data: { user }, error: userError } =
  await userClient.auth.getUser();
if (userError || !user) { ... }
const userId = user.id;
```

### Ficheiros afectados
- `supabase/functions/ghl-list-social-channels/index.ts` (1 ficheiro, redeploy automático)

### Impacto
- Corrige o crash e blank screen
- Sem alteração de lógica de negócio — apenas a autenticação passa a usar o método correto do SDK

