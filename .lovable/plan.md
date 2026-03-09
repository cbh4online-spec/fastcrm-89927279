

## Problema

A navegação V2 (`nav.v2.ts`) referencia `/dashboard/b2b-clients`, mas essa rota não existe no `App.tsx`. A página equivalente já existe em `/dashboard/client-users` (`ClientUsersPage`).

## Correção

Adicionar uma rota em `App.tsx` que aponta `/dashboard/b2b-clients` para o mesmo `ClientUsersPage`:

```tsx
<Route path="/dashboard/b2b-clients" element={<ClientUsersPage />} />
```

### Ficheiro a alterar
- `src/App.tsx` — adicionar rota `/dashboard/b2b-clients`

