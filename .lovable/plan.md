

## Problema

A rota `/marketplace/*` tem um redirect catch-all para `/dashboard/marketplace`, o que faz com que `/marketplace/metodopare` redirecione para o backoffice privado em vez de mostrar uma página pública.

## Solução

1. **Remover o redirect catch-all** `/marketplace/*` → `/dashboard/marketplace`
2. **Criar rota pública** `/marketplace/:workspaceSlug` que redireciona para a página C2C pública existente em `/c2c/:workspaceSlug` (que já funciona como marketplace público)
3. **Manter** `/marketplace` (sem slug) a redirecionar para `/dashboard/marketplace` para utilizadores autenticados, ou alternativamente para uma página pública genérica

### Alterações

**`src/App.tsx`**
- Substituir `<Route path="/marketplace/*" element={<Navigate to="/dashboard/marketplace" replace />} />` por `<Route path="/marketplace/:workspaceSlug" element={<MarketplacePublicRedirect />} />`
- O componente `MarketplacePublicRedirect` lê o `workspaceSlug` dos params e redireciona para `/c2c/:workspaceSlug`
- Alternativa mais simples: usar directamente `<Navigate>` com um wrapper inline que faz o redirect para `/c2c/:slug`

### Resultado
- `/marketplace/metodopare` → redireciona para `/c2c/metodopare` (marketplace público existente)
- `/dashboard/marketplace` → continua privado dentro do backoffice (já está protegido pelo `DashboardLayout`)

