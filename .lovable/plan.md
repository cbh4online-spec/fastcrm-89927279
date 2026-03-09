

## Problema

A navegação V2 referencia `/dashboard/b2b-config`, mas a rota no `App.tsx` está registada como `/dashboard/b2b-portal` (componente `B2BPortalSettingsPage`).

## Correção

Adicionar rota em `App.tsx`:

```tsx
<Route path="/dashboard/b2b-config" element={<B2BPortalSettingsPage />} />
```

### Ficheiro a alterar
- `src/App.tsx` — adicionar rota `/dashboard/b2b-config` apontando para `B2BPortalSettingsPage`

