

# Fix `/dashboard/b2b/plans` — 404

## Problema

O `routeManifest.ts` define a rota `b2b-plans` com path `/dashboard/b2b/plans`, mas não existe nenhuma rota registada no `StoreClientRoutes.tsx` para esse caminho. Também não existe uma página admin dedicada para "Planos B2B" — só existem as páginas do portal do cliente (`ClientPlansPage`).

## Fix

Criar uma rota que aponte `/dashboard/b2b/plans` para a página de configurações do portal B2B (`B2BPortalSettingsPage`), que é a página admin mais relevante para gestão de planos B2B. Alternativa seria criar uma página admin dedicada, mas como os planos são geridos no contexto do portal B2B, faz sentido apontar para as settings.

**Ficheiro**: `src/routes/StoreClientRoutes.tsx`

Adicionar uma linha:

```tsx
<Route path="/dashboard/b2b/plans" element={<B2BPortalSettingsPage />} />
```

Fix de uma linha. Rotas existentes mantêm-se.

