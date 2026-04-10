

## Diagnóstico

O problema é que a edge function `hr-clock-action` está a crashar em **todos os pedidos** porque utiliza `anonClient.auth.getClaims()`, que **não existe** no SDK do Supabase JS. O método correcto é `anonClient.auth.getUser()`.

Isto explica:
- Os logs mostram apenas ciclos de boot/shutdown, sem nenhum pedido processado com sucesso
- Nenhuma chamada a `hr-clock-action` aparece nos analytics de edge functions
- A lista de sessões não actualiza porque nenhuma acção de clock-in/out completa com sucesso

## Plano de Correcção

### Passo 1 — Corrigir autenticação na edge function `hr-clock-action`

Substituir:
```typescript
const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
  authHeader.replace("Bearer ", "")
);
if (claimsError || !claimsData?.claims) { ... }
const authenticatedUserId = claimsData.claims.sub;
```

Por:
```typescript
const { data: { user }, error: userError } = await anonClient.auth.getUser();
if (userError || !user) {
  return errorResponse("Token inválido ou expirado", 401);
}
const authenticatedUserId = user.id;
```

### Passo 2 — Aplicar a mesma correcção nas outras edge functions afectadas

Verificar se `hr-clock-qr` e `hr-face-verify` também usam `getClaims()` e corrigir da mesma forma.

### Passo 3 — Validar build

Confirmar que o build compila sem erros após as alterações.

## Ficheiros a alterar
- `supabase/functions/hr-clock-action/index.ts`
- `supabase/functions/hr-clock-qr/index.ts` (se aplicável)
- `supabase/functions/hr-face-verify/index.ts` (se aplicável)

## Critérios de aceitação
- A edge function processa pedidos de clock-in/out sem erro 500
- A lista de sessões actualiza após cada acção
- Os botões de pausa/terminar aparecem correctamente

