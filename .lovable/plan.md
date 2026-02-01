
# Plano: Corrigir Rota do Portal de Cliente nos Convites

## Diagnóstico

O email de convite está a direccionar os clientes para a rota `/client-portal`, que não existe no sistema de routing.

**Rotas actuais do portal (App.tsx):**
```
/client/login      -> ClientLoginPage
/client/dashboard  -> ClientDashboardPage
/client/catalog    -> ClientCatalogPage
/client/cart       -> ClientCartPage
...
```

## Ficheiros a Corrigir

### 1. InviteClientDialog.tsx (linha 225)

**Antes:**
```typescript
portalUrl: `${window.location.origin}/client-portal`,
```

**Depois:**
```typescript
portalUrl: `${window.location.origin}/client/login`,
```

### 2. ClientUsersList.tsx (funcao resendInvitationMutation)

**Antes:**
```typescript
portalUrl: `${window.location.origin}/client-portal`,
```

**Depois:**
```typescript
portalUrl: `${window.location.origin}/client/login`,
```

### 3. Edge Function send-client-invitation/index.ts (linha 33)

**Antes:**
```typescript
const finalPortalUrl = portalUrl || "https://fastcrm.lovable.app/client-portal";
```

**Depois:**
```typescript
const finalPortalUrl = portalUrl || "https://fastcrm.lovable.app/client/login";
```

## Resumo das Alteracoes

| Ficheiro | Linha | Alteracao |
|----------|-------|-----------|
| `src/components/client-users/InviteClientDialog.tsx` | 225 | `/client-portal` → `/client/login` |
| `src/components/client-users/ClientUsersList.tsx` | ~70 | `/client-portal` → `/client/login` |
| `supabase/functions/send-client-invitation/index.ts` | 33 | `/client-portal` → `/client/login` |

## Resultado Esperado

Apos as alteracoes:
- Os emails de convite terao o link correcto para `/client/login`
- Os clientes serao direccionados para a pagina de login do portal
- A experiencia de onboarding funcionara correctamente
