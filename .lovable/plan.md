

# Fix: Extension Provisioner — `getClaims` não existe

## Problema
Linha 57 do `extension-provisioner/index.ts` usa `supabase.auth.getClaims(token)` — este método **não existe** no cliente Supabase JS v2. A função crasha antes de processar qualquer pedido, por isso não aparecem logs de erro.

## Solução

Substituir `getClaims` por `supabase.auth.getUser(token)` — o método correto para validar o token e extrair o `userId`. Como o `supabase` client já é criado com o header `Authorization` do utilizador (linha 44-48), o `getUser(token)` funciona corretamente.

### Alteração em `supabase/functions/extension-provisioner/index.ts`

**Linhas 56-64** — substituir:
```typescript
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const userId = claimsData.claims.sub as string;
```

**Por:**
```typescript
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const userId = user.id;
```

Nenhuma outra alteração necessária — o resto da função já usa o padrão correto (two-client com `serviceClient` para operações admin).

