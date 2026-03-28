

# Fix `/dashboard/b2b/clients` — 404

## Problema

O `routeManifest.ts` define a rota como `/dashboard/b2b/clients`, mas o `StoreClientRoutes.tsx` só regista `/dashboard/client-users` e `/dashboard/b2b-clients` (com hífen, sem barra). Mesmo padrão do fix anterior de `/dashboard/b2b/approvals`.

## Fix

**Ficheiro**: `src/routes/StoreClientRoutes.tsx`

Adicionar uma linha após a rota existente:

```tsx
<Route path="/dashboard/b2b/clients" element={<ClientUsersPage />} />
```

As rotas anteriores mantêm-se para retrocompatibilidade. Fix de uma linha.

