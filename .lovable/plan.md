

# Adicionar Meta Module à Sidebar e corrigir navegação

## Problema
O módulo Meta não aparece na sidebar porque falta a entrada no `routeManifest.ts` (secção Marketing). As rotas existem em `MetaModuleRoutes.tsx` mas não estão registadas no manifesto de navegação.

## Alterações

### 1. `src/config/routeManifest.ts` — Adicionar entrada Meta na secção Marketing

Após a linha 191 (instagram-looter), adicionar:

```typescript
e("meta-module",     "Meta",            "/dashboard/meta",             Facebook,  "marketing", { moduleSlug: "meta-module" }),
```

Também garantir que `Facebook` é importado do lucide-react no topo do ficheiro (verificar imports existentes).

### 2. Verificar o botão "Abrir" no Marketplace

O botão "Abrir" no detalhe do módulo Meta deve navegar para `/dashboard/meta`. Verificar se o componente do Marketplace usa o `moduleNavRegistry` ou o `routeManifest` para resolver o href — e garantir que ambos apontam para `/dashboard/meta`.

Resultado: O Meta aparecerá na sidebar em **Marketing** quando o módulo estiver instalado, e o botão "Abrir" navegará correctamente para a página do módulo.

