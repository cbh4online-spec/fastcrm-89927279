
# Plano: Corrigir Acesso ao Portal Apos Login

## Diagnostico

O problema foi identificado na logica de autenticacao do cliente B2B:

### Situacao Actual

| Campo | Valor |
|-------|-------|
| `client_users.auth_user_id` | `444ba746-3e86-4283-a363-ad2b27b81dc9` (correcto) |
| `client_users.status` | `pending` |
| Query do hook | `WHERE status = 'active'` |

### Conflito de Logica

```text
1. Edge function cria utilizador Auth
   └── Define client_users.status = "pending"
   
2. Cliente faz login com password temporaria
   └── Hook procura: WHERE status = "active"
   └── Resultado: clientUser = null
   
3. isAuthenticated = !!user && !!clientUser
   └── = true && false = FALSE
   
4. ClientLayout redireciona para /client/login
   └── Loop infinito: login → dashboard → login
```

## Solucao

A correcao requer duas alteracoes:

### 1. Permitir Login com Status "pending"

Modificar o hook `useClientAuth` para aceitar ambos os estados:

```typescript
// ANTES
.eq("status", "active")

// DEPOIS
.in("status", ["active", "pending"])
```

Isto permite que utilizadores com convite pendente (primeiro acesso) consigam fazer login.

### 2. Activar Utilizador Apos Alterar Password

Na pagina `ClientSetPasswordPage`, apos alterar a password com sucesso, actualizar o status para "active":

```typescript
// Apos supabase.auth.updateUser() com sucesso
await supabase
  .from("client_users")
  .update({ status: "active" })
  .eq("auth_user_id", user.id);
```

## Fluxo Corrigido

```text
1. Admin convida cliente
   └── status = "pending"
   
2. Cliente faz login (password temporaria)
   └── Hook encontra cliente (pending OU active)
   └── isAuthenticated = TRUE
   └── Detecta requires_password_change
   └── Redireciona para /client/set-password
   
3. Cliente define nova password
   └── Actualiza password no Auth
   └── Remove flag requires_password_change
   └── Actualiza status para "active"
   
4. Redireciona para /client/dashboard
   └── Acesso completo ao portal
```

## Ficheiros a Modificar

### useClientAuth.ts

**Alteracao**: Modificar query para aceitar status "pending" ou "active"

**Linha afectada**: ~31

### ClientSetPasswordPage.tsx

**Alteracao**: Apos alterar password, actualizar status do cliente para "active"

**Linhas afectadas**: ~50-62 (dentro do handleSubmit)

## Detalhes Tecnicos

### Query Actualizada (useClientAuth.ts)

```typescript
const { data, error: fetchError } = await supabase
  .from("client_users")
  .select("*")
  .eq("auth_user_id", userId)
  .in("status", ["active", "pending"])  // Aceita ambos
  .maybeSingle();
```

### Activacao Apos Password (ClientSetPasswordPage.tsx)

```typescript
// Apos updateUser com sucesso
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await supabase
    .from("client_users")
    .update({ status: "active" })
    .eq("auth_user_id", user.id);
}
```

## Resultado Esperado

Apos as alteracoes:

| Cenario | Antes | Depois |
|---------|-------|--------|
| Login com status "pending" | Falha (loop) | Funciona |
| Redireccionamento para set-password | Nao acontece | Funciona |
| Activacao apos alterar password | Nao existe | Status → "active" |
| Acesso ao dashboard | Bloqueado | Funciona |
