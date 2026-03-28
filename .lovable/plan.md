

# Fix `/dashboard/b2b/users` — 404

## Problema

O `routeManifest.ts` define `b2b-users` com path `/dashboard/b2b/users`, mas o `StoreClientRoutes.tsx` só tem `/dashboard/client-users` e `/dashboard/b2b-clients`. Falta registar a rota `/dashboard/b2b/users`.

## Fix

**Ficheiro**: `src/routes/StoreClientRoutes.tsx`

Adicionar após a linha do `/dashboard/b2b/clients`:

```tsx
<Route path="/dashboard/b2b/users" element={<ClientUsersPage />} />
```

Fix de uma linha. Rotas existentes mantêm-se.

